import { useState, useCallback, useRef } from 'react'
import type { Message, ToolExecution } from '../types.js'
import { sendMessageStream } from '../ai.js'

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const messageIdRef = useRef(0)

  const sendMessage = useCallback(async (message: string) => {
    setIsLoading(true)

    // Add user message
    const userMessage: Message = { id: (++messageIdRef.current).toString(), role: "user", content: message }
    setMessages(prev => [...prev, userMessage])

    // Add placeholder for assistant message
    const assistantMessage: Message = { id: (++messageIdRef.current).toString(), role: "assistant", content: "" }
    setMessages(prev => [...prev, assistantMessage])

    try {
      let accumulatedText = ""

      for await (const chunk of sendMessageStream(message)) {
        // Accumulate all text including tool markers
        accumulatedText += chunk
        setMessages(prev => {
          const newMessages = [...prev]
          const lastMessage = newMessages[newMessages.length - 1]
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
  }, [])

  return {
    messages,
    isLoading,
    sendMessage
  }
}