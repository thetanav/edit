import { useState, useEffect } from "react"
import { Box, Text } from "ink"

type MessageContentProps = {
  content: string
  role: "user" | "assistant"
}

export function MessageContent({ content, role }: MessageContentProps) {
  const [Markdown, setMarkdown] = useState<any>(null)

  useEffect(() => {
    import("ink-markdown").then((mod) => {
      setMarkdown(() => mod.default)
    })
  }, [])

  if (!Markdown || role === "user") {
    return <Text backgroundColor={"blackBright"}>{"> " + content}</Text>
  }

  return (
    <Box marginBottom={1}>
      <Markdown>{content}</Markdown>
    </Box>
  )
}