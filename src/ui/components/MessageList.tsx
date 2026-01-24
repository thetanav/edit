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
        <Box key={msg.id || i} flexDirection="column">
           <Box>
             <Text backgroundColor={"gray"}>
               {msg.role === "user" && "> "}
             </Text>
             <MessageContent content={msg.content} role={msg.role} />
           </Box>
        </Box>
      ))}
    </Box>
  )
}