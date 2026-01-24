import { tool } from "ai";
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import z from "zod";

const execAsync = promisify(exec)

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
      try {
        const { stdout, stderr } = await execAsync(command, {
          timeout: 5_000,
          maxBuffer: 1024 * 1024,
        })

        return {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: 0,
        }
      } catch (err: any) {
        return {
          stdout: err.stdout?.trim() ?? '',
          stderr: err.stderr?.trim() ?? err.message,
          exitCode: err.code ?? 1,
        }
      }
    },
    needsApproval: true,
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