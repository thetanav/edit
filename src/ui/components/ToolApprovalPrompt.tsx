import React from "react"
import { Box, Text } from "ink"
import TextInput from "ink-text-input"

type ToolApprovalPromptProps = {
  toolName: string
  onApprove: () => void
  onReject: () => void
}

export function ToolApprovalPrompt({ toolName, onApprove, onReject }: ToolApprovalPromptProps) {
  const [input, setInput] = React.useState("")

  React.useEffect(() => {
    const handleKeyPress = (input: string, key: any) => {
      if (key.return) {
        if (input.toLowerCase() === "y" || input.toLowerCase() === "yes") {
          onApprove()
        } else if (input.toLowerCase() === "n" || input.toLowerCase() === "no") {
          onReject()
        } else {
          setInput("")
        }
      }
    }

    // Note: This is a simplified version. In a real implementation, you'd use useInput hook from ink
    // For now, we'll use TextInput component
  }, [onApprove, onReject])

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1}>
      <Text color="yellow" bold>
        ⚠️ Tool Approval Required
      </Text>
      <Text>
        Tool "{toolName}" requires approval. Execute? (y/n)
      </Text>
      <Box>
        <Text>&gt; </Text>
        <TextInput value={input} onChange={setInput} onSubmit={(value: string) => {
          if (value.toLowerCase() === "y" || value.toLowerCase() === "yes") {
            onApprove()
          } else {
            onReject()
          }
        }} />
      </Box>
    </Box>
  )
}