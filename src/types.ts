export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ModelOption {
  label: string;
  value: string;
}

export interface ChatServiceOptions {
  model?: string;
}
