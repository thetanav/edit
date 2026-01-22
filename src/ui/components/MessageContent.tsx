import React, { useState, useEffect } from "react"
import { Box, Text } from "ink"
import { marked } from "marked"
import { ToolExecutionDisplay } from './ToolExecutionDisplay.js'
import type { ToolExecution } from '../../types.js'

// Custom renderer for plain text output
const plainTextRenderer = new marked.Renderer()
plainTextRenderer.strong = (text) => text // Remove ** for bold
plainTextRenderer.em = (text) => text // Remove * for italic
plainTextRenderer.codespan = (text) => text // Remove ` for inline code
plainTextRenderer.code = (text) => text // Remove code blocks
plainTextRenderer.link = (href, title, text) => text // Show link text only
plainTextRenderer.heading = (text, level) => `${text}\n` // Keep headings as text
plainTextRenderer.list = (body) => body
plainTextRenderer.listitem = (text) => `• ${text}\n`
plainTextRenderer.paragraph = (text) => `${text}\n`
plainTextRenderer.br = () => '\n'

const renderMarkdownToText = (markdown: string): string => {
  return (marked(markdown, { renderer: plainTextRenderer }) as string).trim()
}

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

    for (const marker of toolMarkers) {
      const [, toolName = ''] = marker

      // Add text before the marker
      if (marker.index !== undefined && marker.index > lastIndex) {
        const textBefore = content.slice(lastIndex, marker.index)
        if (textBefore) {
          parts.push(
            <Text key={`text-${marker.index}`}>{renderMarkdownToText(textBefore)}</Text>
          )
        }
      }

      // Add tool execution component (only once per tool)
      if (toolName && !renderedTools.has(toolName)) {
        const toolEntry = Array.from(toolExecutions.entries())
          .find(([, exec]) => exec.name === toolName)

        if (toolEntry) {
          const [toolId, execution] = toolEntry
          renderedTools.add(toolName)
          parts.push(
            <Box key={`tool-${toolId}`} marginLeft={1}>
              <ToolExecutionDisplay toolExecution={execution} />
            </Box>
          )
        }
      }

      lastIndex = (marker.index || 0) + marker[0].length
    }

    // Add remaining text
    if (lastIndex < content.length) {
      const remainingText = content.slice(lastIndex)
      parts.push(
        <Text key={`text-end`}>{renderMarkdownToText(remainingText)}</Text>
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