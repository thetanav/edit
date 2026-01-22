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
}