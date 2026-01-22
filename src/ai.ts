import { streamText, type ModelMessage } from 'ai'
import { ollama } from 'ollama-ai-provider-v2'
import type { Message } from './types.js'

export const model = ollama("gemma3:1b")

export class ChatAI {
  private model = ollama("gemma3:1b")

  async *sendMessageStream(message: string): AsyncGenerator<string, void, unknown> {
    try {
      const stream = await streamText({
        model: this.model,
        prompt: message,
      })

      for await (const chunk of stream.textStream) {
        yield chunk
      }
    } catch (error) {
      console.error('AI Error:', error)
      throw error
    }
  }

  async sendMessage(message: string): Promise<string> {
    try {
      const fullText = []
      const stream = await streamText({
        model: this.model,
        prompt: message,
      })

      for await (const chunk of stream.textStream) {
        fullText.push(chunk)
      }

      return fullText.join('')
    } catch (error) {
      console.error('AI Error:', error)
      throw error
    }
  }
}

export const chatAI = new ChatAI()
