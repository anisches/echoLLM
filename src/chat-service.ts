import type { OllamaClient } from "./ollama-client.js";
import type { SessionStore } from "./session-store.js";
import type { ChatServiceOptions } from "./types.js";

export class ChatService {
  constructor(
    private readonly deps: {
      ollamaClient: OllamaClient;
      sessionStore: SessionStore;
    }
  ) {}

  get sessionStore(): SessionStore {
    return this.deps.sessionStore;
  }

  async respond(sessionId: string, userText: string, options: ChatServiceOptions = {}): Promise<string> {
    const history = this.deps.sessionStore.getHistory(sessionId);
    const nextHistory = [...history, { role: "user", content: userText }] as const;
    const assistantText = await this.deps.ollamaClient.reply([...nextHistory], options.model);

    this.deps.sessionStore.append(sessionId, { role: "user", content: userText });
    this.deps.sessionStore.append(sessionId, { role: "assistant", content: assistantText });

    return assistantText;
  }
}
