import { useState, useCallback } from 'react'
import type { Message } from '../types.js'
import { chatAI } from '../ai.js'

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

      for await (const chunk of chatAI.sendMessageStream(message)) {
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
      console.error('Error:', error)
      setMessages(prev => {
        const newMessages = [...prev]
        const lastMessage = newMessages[assistantMessageIndex]
        if (lastMessage && lastMessage.role === "assistant") {
          lastMessage.content = "Sorry, I encountered an error."
        }
        return newMessages
      })
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