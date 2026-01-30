import { useState, useCallback, useEffect } from 'react'
import { useInput } from 'ink'
import type { Message } from '../types.js'
import { sendMessage, continueAfterApproval, resetConversation, clearPendingToolCall } from '../ai.js'

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [pendingApproval, setPendingApproval] = useState<boolean>(false)
  const [approvalSelection, setApprovalSelection] = useState<number>(0)

  const handleApprovalCb = useCallback(async (approved: boolean) => {
    setIsLoading(true)
    setPendingApproval(false)
    clearPendingToolCall()

    try {
      const result = await continueAfterApproval(approved)
      
      setMessages(prev => {
        const newMessages = [...prev]
        const last = newMessages[newMessages.length - 1]
        if (last && last.role === "assistant") {
          last.content = result
        }
        return newMessages
      })
    } catch (error) {
      setMessages(prev => {
        const newMessages = [...prev]
        const last = newMessages[newMessages.length - 1]
        if (last && last.role === "assistant") {
          last.content = `Error: ${error}`
        }
        return newMessages
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useInput((input, key) => {
    if (pendingApproval) {
      if (key.upArrow || input === 'k') {
        setApprovalSelection(prev => Math.max(0, prev - 1))
      } else if (key.downArrow || input === 'j') {
        setApprovalSelection(prev => Math.min(1, prev + 1))
      } else if (key.return) {
        handleApprovalCb(approvalSelection === 0)
      }
    }
  }, { isActive: pendingApproval })

  const sendMessageCb = useCallback(async (message: string) => {
    setIsLoading(true)
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content: message }])
    setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "" }])

    try {
      const result = await sendMessage(message)
      
      setMessages(prev => {
        const newMessages = [...prev]
        const last = newMessages[newMessages.length - 1]
        if (last && last.role === "assistant") {
          last.content = result.response
        }
        return newMessages
      })

      if (result.needsApproval) {
        setPendingApproval(true)
        setApprovalSelection(0)
      }
    } catch (error) {
      setMessages(prev => {
        const newMessages = [...prev]
        const last = newMessages[newMessages.length - 1]
        if (last && last.role === "assistant") {
          last.content = `Error: ${error}`
        }
        return newMessages
      })
    } finally {
      setIsLoading(false)
    }
  }, [handleApprovalCb])

  const clearChat = useCallback(() => {
    setMessages([])
    resetConversation()
  }, [])

  return {
    messages,
    isLoading,
    sendMessage: sendMessageCb,
    pendingApproval,
    approvalSelection,
    clearChat,
    handleApproval: handleApprovalCb
  }
}
