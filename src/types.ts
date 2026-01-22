export type Message = {
  role: "user" | "assistant"
  content: string
  toolExecution?: ToolExecution
}

export type ToolExecution = {
  id: string
  name: string
  status: "executing" | "completed" | "error"
}

export type ChatState = {
  messages: Message[]
  isLoading: boolean
}