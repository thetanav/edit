import { generateText } from 'ai'
import { ollama } from 'ollama-ai-provider-v2'
import { tools, session } from './tools.js'
import type { Message } from './types.js'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export const model = ollama("qwen3:8b")

const SYSTEM_PROMPT = `You are a concise AI assistant.

Available tools:
- test: Test tool
- bash: Run shell commands (REQUIRES APPROVAL)
- write: Write files (REQUIRES APPROVAL)
- read: Read files
- grep: Search in files
- glob: Find files by pattern

Be concise. When you need a tool, the user will approve it first. Just describe what you need.`

type ToolCallRequest = {
  toolName: string
  args: Record<string, unknown>
}

type ConversationState = {
  messages: Message[]
  pendingToolCall: ToolCallRequest | null
}

let state: ConversationState = {
  messages: [],
  pendingToolCall: null
}

export function getPendingToolCall() {
  return state.pendingToolCall
}

export function clearPendingToolCall() {
  state.pendingToolCall = null
}

export function resetConversation() {
  state = { messages: [], pendingToolCall: null }
}

async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'test': {
      const { language } = args as { language: string }
      await new Promise(r => setTimeout(r, 500))
      return `${language} is best`
    }
    case 'bash': {
      const { command } = args as { command: string }
      if (command.startsWith('cd ')) {
        const target = command.replace('cd ', '').trim()
        const next = target.startsWith('/') ? target : `${session.cwd}/${target}`
        session.cwd = next
        return `Changed to ${session.cwd}`
      }
      try {
        const { stdout, stderr } = await execAsync(command, { timeout: 10000, maxBuffer: 1024 * 1024, cwd: session.cwd })
        return stdout || stderr || '(no output)'
      } catch (err: any) {
        return `Error: ${err.message}`
      }
    }
    case 'write': {
      const { filePath, content } = args as { filePath: string; content: string }
      await Bun.write(filePath, content)
      return `Wrote to ${filePath}`
    }
    case 'read': {
      const { filePath } = args as { filePath: string }
      const file = Bun.file(filePath)
      if (!await file.exists()) return `File not found: ${filePath}`
      return await file.text()
    }
    case 'grep': {
      const { pattern, path, include } = args as { pattern: string; path?: string; include?: string }
      const searchDir = path || session.cwd
      const { Glob } = await import("bun")
      const glob = new Glob(include || "**/*")
      const files = Array.from(glob.scanSync({ cwd: searchDir }))
      const results: string[] = []
      const regex = new RegExp(pattern, 'g')
      for (const file of files) {
        try {
          const content = await Bun.file(`${searchDir}/${file}`).text()
          const lines = content.split('\n')
          let match
          while ((match = regex.exec(content)) !== null) {
            const beforeMatch = content.substring(0, match.index)
            const lineNumber = beforeMatch.split('\n').length
            results.push(`${file}:${lineNumber}: ${lines[lineNumber - 1]?.trim() || ''}`)
          }
        } catch { }
      }
      return results.slice(0, 50).join('\n') || 'No matches found'
    }
    case 'glob': {
      const { pattern, path } = args as { pattern: string; path?: string }
      const searchDir = path || session.cwd
      const { Glob } = await import("bun")
      const glob = new Glob(pattern)
      return Array.from(glob.scanSync({ cwd: searchDir })).join('\n') || 'No files found'
    }
    default:
      return `Unknown tool: ${name}`
  }
}

function createToolDefs() {
  return Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => [
      name,
      { ...tool, execute: async () => ({}) }
    ])
  )
}

export async function sendMessage(message: string): Promise<{ response: string; needsApproval: boolean }> {
  state.messages.push({ role: "user", content: message })

  const result = await generateText({
    model,
    messages: state.messages.map(m => ({ role: m.role, content: m.content })),
    tools: createToolDefs(),
  })

  if (result.text) {
    state.messages.push({ role: "assistant", content: result.text })
    return { response: result.text, needsApproval: false }
  }

  if (result.toolCalls && result.toolCalls.length > 0) {
    const toolCall = result.toolCalls[0] as any
    const toolName = toolCall.toolName || toolCall.function?.name
    const args = toolCall.args || toolCall.function?.arguments || {}
    const needsApproval = (tools as any)[toolName]?.needsApproval ?? false

    state.pendingToolCall = { toolName, args }

    if (needsApproval) {
      return { response: `Tool request: ${toolName}`, needsApproval: true }
    } else {
      const toolResult = await executeTool(toolName, args)
      state.messages.push({ role: "user", content: `[TOOL_RESULT]${toolName}: ${toolResult}` })
      return sendMessage('')
    }
  }

  return { response: result.text || '', needsApproval: false }
}

export async function continueAfterApproval(approved: boolean): Promise<string> {
  const toolCall = state.pendingToolCall
  if (!toolCall) return 'No pending tool call'

  state.pendingToolCall = null

  if (!approved) {
    state.messages.push({ role: "assistant", content: `User rejected the ${toolCall.toolName} tool call.` })
    return `[REJECTED:${toolCall.toolName}]`
  }

  const toolResult = await executeTool(toolCall.toolName, toolCall.args)
  state.messages.push({ role: "user", content: `[TOOL_RESULT]${toolCall.toolName}: ${toolResult}` })

  const result = await generateText({
    model,
    messages: state.messages.map(m => ({ role: m.role, content: m.content })),
    tools: createToolDefs(),
  })

  if (result.text) {
    state.messages.push({ role: "assistant", content: result.text })
    return result.text
  }

  if (result.toolCalls && result.toolCalls.length > 0) {
    const nextTool = result.toolCalls[0] as any
    const toolName = nextTool.toolName || nextTool.function?.name
    const args = nextTool.args || nextTool.function?.arguments || {}
    const needsApproval = (tools as any)[toolName]?.needsApproval ?? false

    state.pendingToolCall = { toolName, args }

    if (needsApproval) {
      return `Tool request: ${toolName}`
    } else {
      const nextResult = await executeTool(toolName, args)
      state.messages.push({ role: "user", content: `[TOOL_RESULT]${toolName}: ${nextResult}` })
      return continueAfterApproval(true)
    }
  }

  return result.text || ''
}
