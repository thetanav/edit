import React from "react"
import { Box, Text } from "ink"
import TextInput from "ink-text-input"

type MessageInputProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  isLoading: boolean
  placeholder?: string
}

export function MessageInput({ value, onChange, onSubmit, isLoading, placeholder }: MessageInputProps) {
  return (
    <Box>
      <Text color="cyan">
        {isLoading ? "* " : "> "}
      </Text>
      <TextInput
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder={placeholder ?? (isLoading ? "Waiting for response..." : "Type your message...")}
      />
    </Box>
  )
}