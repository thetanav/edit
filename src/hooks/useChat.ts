import { useState, useCallback } from 'react'
import type { Message, ToolExecution } from '../types.js'
import { sendMessageStream } from '../ai.js'

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(async (message: string) => {
    setIsLoading(true)

    // Add user message
    const userMessage: Message = { role: "user", content: message }
    setMessages(prev => [...prev, userMessage])

    // Add placeholder for assistant message
    const assistantMessageIndex = messages.length + 1
    setMessages(prev => [...prev, { role: "assistant", content: "" }])

    try {
      let accumulatedText = ""

      for await (const chunk of sendMessageStream(message)) {
        // Accumulate all text including tool markers
        accumulatedText += chunk
        setMessages(prev => {
          const newMessages = [...prev]
          const lastMessage = newMessages[assistantMessageIndex]
          if (lastMessage && lastMessage.role === "assistant") {
            lastMessage.content = accumulatedText
          }
          return newMessages
        })
      }
    } catch (error) {
      // Error messages are already yielded by sendMessageStream
    } finally {
      setIsLoading(false)
    }
  }, [messages.length])

  return {
    messages,
    isLoading,
    sendMessage
  }
}