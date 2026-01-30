import { tool } from "ai";
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { Glob } from "bun";
import z from "zod";

const execAsync = promisify(exec)

export const session = {
  cwd: process.cwd(),
}

export type ToolCall = {
  id: string
  name: string
  args: Record<string, unknown>
  approved?: boolean
  result?: unknown
}

export const pendingToolCalls: Map<string, ToolCall> = new Map()

export const tools = {
  test: tool({
    description: 'This is a test tool that always runs',
    inputSchema: z.object({
      language: z.string().describe('any language name'),
    }),
    execute: async ({ language }) => {
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
    needsApproval: true,
  }),
  write: tool({
    description: 'Write or edit files in the filesystem',
    inputSchema: z.object({
      filePath: z.string().describe('Absolute path to the file to write'),
      content: z.string().describe('The content to write to the file'),
    }),
    execute: async ({ filePath, content }) => {
      await Bun.write(filePath, content)
      return `Successfully wrote to ${filePath}`
    },
    needsApproval: true,
  }),
  read: tool({
    description: 'Read the contents of a file',
    inputSchema: z.object({
      filePath: z.string().describe('Absolute path to the file to read'),
    }),
    execute: async ({ filePath }) => {
      const file = Bun.file(filePath)
      if (!await file.exists()) {
        throw new Error(`File not found: ${filePath}`)
      }
      return await file.text()
    },
    needsApproval: false,
  }),
  grep: tool({
    description: 'Search for regex patterns in files',
    inputSchema: z.object({
      pattern: z.string().describe('The regex pattern to search for'),
      path: z.string().optional().describe('The directory to search in (defaults to current working directory)'),
      include: z.string().optional().describe('File pattern to include (e.g. "*.js", "*.{ts,tsx}")'),
    }),
    execute: async ({ pattern, path, include }) => {
      const searchDir = path || session.cwd;
      const globPattern = include || "**/*";
      const glob = new Glob(globPattern);
      const files = Array.from(glob.scanSync({ cwd: searchDir }));
      
      const results = [];
      const regex = new RegExp(pattern, 'g');
      
      for (const file of files) {
        try {
          const content = await Bun.file(`${searchDir}/${file}`).text();
          const lines = content.split('\n');
          
          let match;
          while ((match = regex.exec(content)) !== null) {
            const beforeMatch = content.substring(0, match.index);
            const lineNumber = beforeMatch.split('\n').length;
            results.push({
              file: file,
              line: lineNumber,
              match: match[0],
              context: lines[lineNumber - 1]?.trim() || ''
            });
          }
        } catch (error) {
          continue;
        }
      }
      
      return results;
    },
    needsApproval: false,
  }),
  glob: tool({
    description: 'Find files matching a glob pattern',
    inputSchema: z.object({
      pattern: z.string().describe('The glob pattern to match (e.g., "**/*.ts")'),
      path: z.string().optional().describe('The directory to search in (defaults to current working directory)'),
    }),
    execute: async ({ pattern, path }) => {
      const searchDir = path || session.cwd;
      const glob = new Glob(pattern);
      const files = Array.from(glob.scanSync({ cwd: searchDir }));
      return files;
    },
    needsApproval: false,
  }),
}