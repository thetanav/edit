import React, { useState, useEffect } from "react"
import { Box, Text } from "ink"
import type { ToolExecution } from '../../types.js'
import Spinner from "ink-spinner"

type ToolExecutionDisplayProps = {
  toolExecution: ToolExecution
}

export function ToolExecutionDisplay({ toolExecution }: ToolExecutionDisplayProps) {
  const getDisplayStatus = () => {
    switch (toolExecution.status) {
      case 'executing':
        return
      case 'completed':
        return
      case 'error':
        return
      default:
        return <Text>{toolExecution.name}</Text>
    }
  }

  return (
    <Box flexDirection="column">
      <Text color={
        toolExecution.status === 'executing' ? 'cyan' :
          toolExecution.status === 'completed' ? 'green' :
            toolExecution.status === 'error' ? 'red' : 'white'
      }>
        {
          toolExecution.status === 'executing' && <Text><Spinner type="dots" /></Text>
        }
        {
          toolExecution.status === 'completed' && <Text>✔</Text>
        }
        {
          toolExecution.status === 'error' && <Text>✘</Text>
        }
        {" " + toolExecution.name}
      </Text>
      {toolExecution.message && (
        <Text>↪ {toolExecution.message}</Text>
      )}
    </Box>
  )
}