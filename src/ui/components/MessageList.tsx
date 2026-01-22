import React from "react"
import { Box, Text } from "ink"
import type { Message } from '../../types.js'

type MessageListProps = {
  messages: Message[]
  isLoading: boolean
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  return (
    <Box flexDirection="column" flexGrow={1}>
      {messages.map((msg, i) => (
        <Box key={i} marginBottom={1}>
          <Text color={msg.role === "user" ? "green" : "blue"}>
            {msg.role === "user" ? "> " : "< "}
          </Text>
          <Text>{msg.content}</Text>
        </Box>
      ))}
      {isLoading && (
        <Box>
          <Text color="yellow">Thinking...</Text>
        </Box>
      )}
    </Box>
  )
}