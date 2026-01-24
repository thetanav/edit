export type Message = {
  id?: string
  role: "user" | "assistant"
  content: string
  toolExecution?: ToolExecution
}

export type ToolExecution = {
  id: string
  name: string
  status: "executing" | "completed" | "error"
  message?: string
}

export type ChatState = {
  messages: Message[]
  isLoading: boolean
}