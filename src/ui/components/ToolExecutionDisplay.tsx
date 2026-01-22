import React, { useState, useEffect } from "react"
import { Box, Text } from "ink"
import type { ToolExecution } from '../../types.js'

type ToolExecutionDisplayProps = {
  toolExecution: ToolExecution
}

export function ToolExecutionDisplay({ toolExecution }: ToolExecutionDisplayProps) {
  const [spinnerFrame, setSpinnerFrame] = useState(0)
  const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

  useEffect(() => {
    if (toolExecution.status === 'executing') {
      const interval = setInterval(() => {
        setSpinnerFrame(prev => (prev + 1) % spinnerFrames.length)
      }, 100)
      return () => clearInterval(interval)
    }
  }, [toolExecution.status])

  const getDisplayStatus = () => {
    switch (toolExecution.status) {
      case 'executing':
        return `${spinnerFrames[spinnerFrame]}`
      case 'completed':
        return `✓`
      case 'error':
        return `✘`
      default:
        return toolExecution.name
    }
  }

  return (
    <Text color={
      toolExecution.status === 'executing' ? 'cyan' :
        toolExecution.status === 'completed' ? 'green' :
          toolExecution.status === 'error' ? 'red' : 'white'
    }>
      {getDisplayStatus() + " " + toolExecution.name}
    </Text>
  )
}