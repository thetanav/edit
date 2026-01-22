import React from "react"
import { Box, Text } from "ink"
import type { Message } from '../../types.js'
import { MessageContent } from './MessageContent.js'

type MessageListProps = {
  messages: Message[]
  isLoading: boolean
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  return (
    <Box flexDirection="column" flexGrow={1}>
      {messages.map((msg, i) => (
        <Box key={i} flexDirection="column" marginBottom={1}>
          <Box>
            <Text color={msg.role === "user" ? "green" : "blue"}>
              {msg.role === "user" && "> "}
            </Text>
            <MessageContent content={msg.content} />
          </Box>
        </Box>
      ))}

      {isLoading && (
        <Box alignItems="flex-end">
          <Text color="yellow">Thinking...</Text>
        </Box>
      )}
    </Box>
  )
}