 import React, { useState, useEffect } from "react"
 import { Box, Text } from "ink"
 import { marked } from "marked"
 import TerminalRenderer from "marked-terminal"
 import { ToolExecutionDisplay } from './ToolExecutionDisplay.js'
 import type { ToolExecution } from '../../types.js'

type MessageContentProps = {
  content: string
}

export function MessageContent({ content }: MessageContentProps) {
  const [toolExecutions, setToolExecutions] = useState<Map<string, ToolExecution>>(new Map())

  useEffect(() => {
    const newToolExecutions = new Map(toolExecutions)

    // Parse content for tool markers
    const toolStartRegex = /\[TOOL_START:([^\]]+)\]/g
    const toolEndRegex = /\[TOOL_END:([^\]]+)\]/g

    let match
    while ((match = toolStartRegex.exec(content)) !== null) {
      const toolName = match[1]
      if (!toolName) continue

      // Check if this tool is already executing
      const existingTool = Array.from(newToolExecutions.values())
        .find(exec => exec.name === toolName)

      if (existingTool) {
        // Update existing tool back to executing status
        newToolExecutions.set(existingTool.id, {
          ...existingTool,
          status: 'executing'
        })
      } else {
        // Create new tool execution
        const toolId = `tool_${toolName}_${Date.now()}`
        newToolExecutions.set(toolId, {
          id: toolId,
          name: toolName,
          status: 'executing'
        })
      }
    }

    while ((match = toolEndRegex.exec(content)) !== null) {
      const toolName = match[1]
      if (!toolName) continue

      // Find and update the corresponding tool execution to completed
      for (const [id, execution] of newToolExecutions) {
        if (execution.name === toolName && execution.status === 'executing') {
          newToolExecutions.set(id, {
            ...execution,
            status: 'completed'
          })
          break
        }
      }
    }

    setToolExecutions(newToolExecutions)
  }, [content])

  // Split content by tool markers and render appropriately
  const renderContent = () => {
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    const toolMarkers = Array.from(content.matchAll(/\[TOOL_(?:START|END):([^\]]+)\]/g))
    const renderedTools = new Set<string>()

    // Collect all tool executions for top display
    const toolComponents: React.ReactNode[] = []
    for (const marker of toolMarkers) {
      const [, toolName = ''] = marker

      // Add tool execution component (only once per tool)
      if (toolName && !renderedTools.has(toolName)) {
        const toolEntry = Array.from(toolExecutions.entries())
          .find(([, exec]) => exec.name === toolName)

        if (toolEntry) {
          const [toolId, execution] = toolEntry
          renderedTools.add(toolName)
          toolComponents.push(
            <Box key={`tool-${toolId}`} marginLeft={1}>
              <ToolExecutionDisplay toolExecution={execution} />
            </Box>
          )
        }
      }
    }

    // Render tools at top
    if (toolComponents.length > 0) {
      parts.push(
        <Box key="tools-top" flexDirection="column" marginBottom={1}>
          {toolComponents}
        </Box>
      )
    }

    // Render markdown content without tool markers
    const contentWithoutMarkers = content.replace(/\[TOOL_(?:START|END):([^\]]+)\]/g, '')
    if (contentWithoutMarkers.trim()) {
      parts.push(
        <Text key="markdown-content">{(marked.parse as any)(contentWithoutMarkers, { renderer: new TerminalRenderer() })}</Text>
      )
    }

    return parts
  }

  return (
    <Box flexDirection="column">
      {renderContent()}
    </Box>
  )
}