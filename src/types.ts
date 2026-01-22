export type Message = {
  role: "user" | "assistant"
  content: string
}

export type ChatState = {
  messages: Message[]
  isLoading: boolean
}