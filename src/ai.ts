import { stepCountIs, streamText, type ModelMessage } from 'ai'
import { ollama } from 'ollama-ai-provider-v2'
import { tools } from './tools.js'
import type { Message } from './types.js'

export const model = ollama("qwen3:8b")

const SYSTEM_PROMPT = `You are a concise, efficient AI assistant with access to powerful tools. Follow these rules strictly:

## BE CONCISE
- Answer questions directly with minimal text
- Use one-word answers when possible
- Avoid explanations unless asked
- No preamble or postamble

## USE TOOLS PROACTIVELY
- Use tools immediately when needed - don't explain first
- Read files, write code, run commands without asking permission
- For file operations: read first, then edit/write as needed
- For system tasks: use bash tool directly

## CLARITY FIRST
- If anything is unclear, ask the user one specific question
- Don't make assumptions about file paths, requirements, or intent
- When confused about task scope, ask for clarification

## WORK EFFICIENTLY
- Complete tasks directly without unnecessary steps
- Use appropriate tools for each operation
- Chain tool calls when logical (read → edit → test)
- Focus on results, not process explanation

Available tools: read (file reading), write (file writing), edit (file editing), bash (command execution), test (testing tool)`

const messages: Message[] = []

export async function* sendMessageStream(message: string): AsyncGenerator<string, void, unknown> {
  try {
    messages.push({
      role: "user",
      content: message
    })

    // Prepare messages for AI with system prompt
    const aiMessages: ModelMessage[] = [
      ...messages as ModelMessage[]
    ]

    const stream = streamText({
      model,
      messages: aiMessages,
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