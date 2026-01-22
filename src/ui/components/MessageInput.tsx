import React from "react"
import { Box, Text } from "ink"
import TextInput from "ink-text-input"

type MessageInputProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  isLoading: boolean
}

export function MessageInput({ value, onChange, onSubmit, isLoading }: MessageInputProps) {
  return (
    <Box paddingTop={1}>
      <Text color="cyan">{"> "}</Text>
      <TextInput
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder={isLoading ? "Waiting for response..." : "Type your message..."}
      />
    </Box>
  )
}