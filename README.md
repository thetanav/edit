# Claude Code Clone

A modular CLI chat application built with Bun, Ink, and Ollama AI.

## Installation

```bash
bun install
```

## Usage

```bash
bun run start
# or
bun run src/index.ts
```

Type your messages and get streaming AI responses!

## Project Structure

```
src/
├── index.ts          # Application entry point
├── types.ts          # TypeScript type definitions
├── ai.ts             # AI integration and chat logic
├── hooks/
│   └── useChat.ts    # Custom hook for chat functionality
└── ui/
    ├── view.tsx      # Main UI component
    └── components/
        ├── index.ts      # Component exports
        ├── MessageList.tsx   # Message display component
        └── MessageInput.tsx  # Input component
```

## Architecture

- **Separation of Concerns**: UI, AI logic, and state management are properly separated
- **Modular Components**: Reusable UI components for maintainability
- **Custom Hooks**: Business logic encapsulated in hooks for reusability
- **Type Safety**: Full TypeScript support with proper type definitions

## Key Features

- Real-time streaming AI responses
- Clean CLI interface with Ink
- Modular architecture for easy extension
- Error handling and loading states

## Dependencies

- **Bun**: Fast JavaScript runtime
- **Ink**: React for CLI applications
- **Ollama AI**: Local AI model integration
- **AI SDK**: Streaming AI responses

This project was created using `bun init` in bun v1.3.5. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
