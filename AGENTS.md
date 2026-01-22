# AGENTS.md - Development Guidelines for AI Coding Agents

This file contains essential guidelines for AI coding agents working on this Bun-based CLI application.

## Build, Lint, and Test Commands

### Running the Application
```bash
# Start the development server
bun run start
# or directly
bun run src/index.ts

# Run with hot reload (if needed)
bun --hot src/index.ts
```

### Testing
```bash
# Run all tests
bun test

# Run a specific test file
bun test src/path/to/test.test.ts

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage
```

### Linting and Type Checking
```bash
# TypeScript type checking
bun run tsc --noEmit

# If ESLint is added later, use:
bun run lint
bun run lint:fix
```

### Building
```bash
# Build for production (if build script is added)
bun run build

# Create executable
bun build --compile src/index.ts --outfile edit
```

## Code Style Guidelines

### TypeScript Configuration
- **Strict mode**: Always enabled (`"strict": true`)
- **Module resolution**: Use bundler resolution
- **JSX**: Use React JSX transform (`"jsx": "react-jsx"`)
- **Module type**: ES modules (`"type": "module"`)

### Import Conventions
```typescript
// External dependencies first
import React from "react"
import { Box, Text } from "ink"
import { tool } from "ai"
import z from "zod"

// Local imports with .js extensions (even for .ts files)
import type { Message } from '../types.js'
import { useChat } from '../hooks/useChat.js'

// Group imports logically:
// 1. React/React-related
// 2. External libraries
// 3. Local types/interfaces
// 4. Local utilities/hooks
// 5. Local components
```

### Naming Conventions
- **Files**: PascalCase for components (`MessageList.tsx`), camelCase for utilities (`useChat.ts`)
- **Components**: PascalCase (`MessageInput`, `ToolExecutionDisplay`)
- **Functions/Hooks**: camelCase (`useChat`, `sendMessage`)
- **Types/Interfaces**: PascalCase (`Message`, `ChatState`)
- **Constants**: UPPER_SNAKE_CASE for exported constants
- **Variables**: camelCase, descriptive names

### Component Structure
```typescript
import React from "react"
import { Box, Text } from "ink"
import type { Message } from '../../types.js'

type ComponentNameProps = {
  requiredProp: string
  optionalProp?: number
}

export function ComponentName({ requiredProp, optionalProp }: ComponentNameProps) {
  // Component logic here

  return (
    <Box>
      <Text>{requiredProp}</Text>
    </Box>
  )
}
```

### TypeScript Types
- Use interfaces for object shapes
- Use type aliases for unions and primitives
- Prefer `type` over `interface` for API responses and complex types
- Always type function parameters and return values
- Use `unknown` over `any` when type is uncertain

```typescript
// Good
export type Message = {
  role: "user" | "assistant"
  content: string
  toolExecution?: ToolExecution
}

// Prefer interfaces for component props
interface MessageListProps {
  messages: Message[]
  isLoading: boolean
}
```

### Error Handling
- Use try/catch blocks for async operations
- Provide meaningful error messages
- Log errors appropriately for debugging
- Handle loading states in UI components

```typescript
try {
  const result = await someAsyncOperation()
  return result
} catch (error) {
  console.error(`Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  throw error
}
```

### Async/Await Patterns
- Use async/await over Promise chains
- Use `for await...of` for streaming operations
- Handle cleanup in finally blocks
- Use `useCallback` for async functions in React hooks

### State Management
- Use React hooks for local component state
- Prefer `useState` with functional updates for complex state
- Use `useCallback` to prevent unnecessary re-renders
- Keep state as close to where it's used as possible

### AI Integration Guidelines
- Use the `ai` library for AI interactions
- Define tools using the `tool()` function with Zod schemas
- Handle streaming responses with async generators
- Include tool execution markers in responses: `[TOOL_START:name]` and `[TOOL_END:name]`

### AI Assistant Behavior
- **Be Concise**: Answer directly with minimal text, use one-word answers when possible
- **Use Tools Proactively**: Use tools immediately when needed - read files, write code, run commands without asking permission
- **Ask When Confused**: If anything is unclear, ask the user one specific question instead of making assumptions
- **Work Efficiently**: Complete tasks directly, chain tool calls when logical, focus on results not process explanation

### Bun-Specific Guidelines

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

### API Usage

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

### Testing

Use `bun test` to run tests.

```typescript
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

### Frontend (if applicable)

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```typescript
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.

### Code Organization
- Keep components in `src/ui/components/`
- Put custom hooks in `src/hooks/`
- Store types in `src/types.ts`
- Keep AI logic in `src/ai.ts`
- Define tools in `src/tools.ts`
- Use index files for clean imports

### Performance Considerations
- Use `React.memo` for expensive components when necessary
- Optimize re-renders with proper dependency arrays in hooks
- Consider virtualization for long lists
- Bundle analysis with `bun build --analyze`

### Security Best Practices
- Validate all inputs with Zod schemas
- Sanitize AI-generated content before display
- Never commit secrets or API keys
- Use environment variables for configuration
- Implement proper error boundaries

### Git Workflow
- Write clear, concise commit messages
- Use conventional commits when possible
- Test before committing
- Keep commits focused on single changes
- Use feature branches for new functionality</content>
<parameter name="filePath">/home/thetanav/Code/project/edit/AGENTS.md