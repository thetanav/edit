import { tool } from "ai";
import z from "zod";

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

  read: tool({
    description: 'Read a file from the filesystem.',
    inputSchema: z.object({
      filePath: z.string().describe('The path to the file to read'),
      limit: z.number().optional().describe('The number of lines to read (defaults to 50)'),
      offset: z.number().optional().describe('The line number to start reading from (0-based)'),
    }),
    execute: async ({ filePath, limit = 50, offset = 0 }) => {
      try {
        const file = Bun.file(filePath);
        const exists = await file.exists();
        if (!exists) {
          return `File not found: ${filePath}`;
        }

        const content = await file.text();
        const lines = content.split('\n');

        // Apply offset and limit
        const startLine = Math.max(0, offset);
        const endLine = Math.min(lines.length, startLine + limit);
        const selectedLines = lines.slice(startLine, endLine);

        // Format with line numbers (1-based)
        const formattedLines = selectedLines.map((line, index) =>
          `${(startLine + index + 1).toString().padStart(6)}  ${line}`
        );

        const result = formattedLines.join('\n');
        return result || '(empty file)';
      } catch (error) {
        return `Error reading file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  }),

  write: tool({
    description: 'Write a file to the filesystem.',
    inputSchema: z.object({
      filePath: z.string().describe('The absolute path to the file to write'),
      content: z.string().describe('The content to write to the file'),
    }),
    execute: async ({ filePath, content }) => {
      try {
        await Bun.write(filePath, content);
        return `Successfully wrote ${content.length} characters to ${filePath}`;
      } catch (error) {
        return `Error writing file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  }),

  bash: tool({
    description: 'Executes a bash command in the shell. Use this for running system commands, git operations, package management, etc.',
    inputSchema: z.object({
      command: z.string().describe('The command to execute'),
      description: z.string().describe('Brief description of what this command does'),
      timeout: z.number().optional().describe('Optional timeout in milliseconds (default 12000)'),
      workdir: z.string().optional().describe('Working directory to run the command in'),
    }),
    execute: async ({ command, description, timeout = 12000, workdir }) => {
      try {
        const proc = Bun.spawn(command.split(' '), {
          cwd: workdir,
          stdout: 'pipe',
          stderr: 'pipe',
        });

        // Set up timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Command timed out')), timeout);
        });

        // Wait for the process to complete or timeout
        const exitCode = await Promise.race([
          proc.exited,
          timeoutPromise,
        ]);

        if (command.includes("rm") || command.includes("sudo")) return "Error exit from here";

        const stdout = await new Response(proc.stdout).text();
        const stderr = await new Response(proc.stderr).text();

        if (exitCode !== 0) {
          return `Command failed (exit code ${exitCode}):\n${stderr || stdout}`;
        }

        return `Command succeeded:\n${stdout || '(no output)'}`;
      } catch (error) {
        return `Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  }),
}