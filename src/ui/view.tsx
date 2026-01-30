import React, { useState } from "react"
import { Box, render, Text } from "ink"
import { MessageList } from './components/MessageList.js'
import { MessageInput } from './components/MessageInput.js'
import { useChat } from '../hooks/useChat.js'
import { getPendingToolCall } from '../ai.js'

export default function App() {
  const [input, setInput] = useState("")
  const { messages, isLoading, sendMessage, pendingApproval, approvalSelection, handleApproval } = useChat()

  const pendingTool = pendingApproval ? getPendingToolCall() : null

  const handleSubmit = (value: string) => {
    if (value.trim() && !isLoading) {
      if (pendingApproval) {
        handleApproval(value.toLowerCase() === 'y' || value.toLowerCase() === 'yes')
      } else {
        sendMessage(value.trim())
      }
      setInput("")
    }
  }

  return (
    <Box flexDirection="column" height="100%">
      <Box marginBottom={1}>
        <Text color="green" bold>=== AI in CLI ===</Text>
      </Box>
      {pendingApproval && pendingTool && (
        <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1} marginBottom={1}>
          <Text color="yellow" bold>⚠️ Tool Approval Required</Text>
          <Text color="white">  → {pendingTool.toolName}</Text>
          <Text color="gray">  {JSON.stringify(pendingTool.args)}</Text>
          <Box marginTop={1}>
            <Text color={approvalSelection === 0 ? "green" : "gray"}>{approvalSelection === 0 ? '▶' : ' '} Yes</Text>
          </Box>
          <Box>
            <Text color={approvalSelection === 1 ? "green" : "gray"}>{approvalSelection === 1 ? '▶' : ' '} No</Text>
          </Box>
          <Text color="gray">↑↓ to select, Enter to confirm</Text>
        </Box>
      )}
      <MessageList messages={messages} isLoading={isLoading} />
      <MessageInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        placeholder={pendingApproval ? "Press Enter to confirm..." : "Type a message..."}
      />
    </Box>
  )
}

render(<App />)
