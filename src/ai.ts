import { stepCountIs, streamText, type ModelMessage } from 'ai'
import { ollama } from 'ollama-ai-provider-v2'
import { tools } from './tools.js'
import type { Message } from './types.js'

export const model = ollama("qwen3:8b")
const messages: Message[] = []

export async function* sendMessageStream(message: string): AsyncGenerator<string, void, unknown> {
  try {
    messages.push({
      role: "user",
      content: message
    })

    const stream = streamText({
      model,
      messages: messages as ModelMessage[],
      tools,
      stopWhen: stepCountIs(20)
    })

    // Handle tool calls and text streaming
    for await (const chunk of stream.fullStream) {
      if (chunk.type === 'text-delta') {
        yield chunk.text
      } else if (chunk.type === 'tool-call') {
        // Insert tool start marker where the LLM decides
        yield `[TOOL_START:${chunk.toolName}]`
      } else if (chunk.type === 'tool-result') {
        // Insert tool end marker
        yield `[TOOL_END:${chunk.toolName}]`
        // Add tool result to conversation for AI to continue
        messages.push({
          role: "assistant",
          content: `Tool ${chunk.toolName} has been executed successfully.`
        })
      }
    }
  } catch (error) {
    yield `\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
    throw error
  }
}