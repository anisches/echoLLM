import type { ChatMessage } from "./types.js";

export class SessionStore {
  private readonly sessions = new Map<string, ChatMessage[]>();

  private readonly selectedModels = new Map<string, string>();

  constructor(private readonly maxMessages = 24) {}

  getHistory(sessionId: string): ChatMessage[] {
    return this.sessions.get(sessionId) ?? [];
  }

  append(sessionId: string, message: ChatMessage): ChatMessage[] {
    const current = this.getHistory(sessionId);
    const next = [...current, message].slice(-this.maxMessages);
    this.sessions.set(sessionId, next);
    return next;
  }

  reset(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.selectedModels.delete(sessionId);
  }

  getSelectedModel(sessionId: string): string | null {
    return this.selectedModels.get(sessionId) ?? null;
  }

  setSelectedModel(sessionId: string, modelName: string | null | undefined): string | null {
    if (!modelName) {
      this.selectedModels.delete(sessionId);
      return null;
    }

    this.selectedModels.set(sessionId, modelName);
    return modelName;
  }
}
