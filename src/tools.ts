import { tool } from "ai";
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import z from "zod";

const execAsync = promisify(exec)

export const session = {
  cwd: process.cwd(),
}

export const tools = {
  test: tool({
    description: 'This is a test tool that always runs',
    inputSchema: z.object({
      language: z.string().describe('any language name'),
    }),
    execute: async ({ language }) => {
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 1000))
      return `${language} is best`
    },
  }),
  bash: tool({
    description: 'Run a shell command and return stdout and stderr',
    inputSchema: z.object({
      command: z.string().describe('The bash command to execute'),
    }),
    execute: async ({ command }) => {
      if (command.startsWith('cd ')) {
        const target = command.replace('cd ', '').trim()
        const next = target.startsWith('/')
          ? target
          : `${session.cwd}/${target}`

        session.cwd = next
        return {
          stdout: '',
          stderr: '',
          exitCode: 0,
          cwd: session.cwd,
          message: command
        }
      }
      try {
        const { stdout, stderr } = await execAsync(command, {
          timeout: 5_000,
          maxBuffer: 1024 * 1024,
          cwd: session.cwd
        })

        return {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: 0,
          cwd: session.cwd,
          message: command
        }
      } catch (err: any) {
        return {
          stdout: err.stdout?.trim() ?? '',
          stderr: err.stderr?.trim() ?? err.message,
          exitCode: err.code ?? 1,
          cwd: session.cwd,
          message: command
        }
      }
    },
    // needsApproval: true,
  }),
  write: tool({
    description: 'This is a test tool that edits a file',
    inputSchema: z.object({
      language: z.string().describe('any language name'),
    }),
    execute: async ({ language }) => {
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 1000))
      return `${language} is best`
    },
  }),
}