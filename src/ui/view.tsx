import React, { useState } from "react"
import { Box, render, Text } from "ink"
import { MessageList } from './components/MessageList.js'
import { MessageInput } from './components/MessageInput.js'
import { useChat } from '../hooks/useChat.js'
import BigText from 'ink-big-text';

export default function App() {
  const [input, setInput] = useState("")
  const { messages, isLoading, sendMessage } = useChat()

  const handleSubmit = (value: string) => {
    if (value.trim() && !isLoading) {
      sendMessage(value.trim())
      setInput("")
    }
  }

  return (
    <Box flexDirection="column" height="100%" >
      <Text bold color={"green"}>AI in CLI</Text>
      <MessageList messages={messages} isLoading={isLoading} />
      <MessageInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </Box>
  )
}

render(<App />)