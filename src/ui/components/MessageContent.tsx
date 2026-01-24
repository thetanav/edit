import React, { useState, useEffect } from "react"
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
    return <Text backgroundColor={"gray"}>{content}</Text>
  }

  return (
    <Markdown>{content}</Markdown>
  )
}