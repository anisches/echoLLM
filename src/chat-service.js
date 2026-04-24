export class ChatService {
  constructor({ ollamaClient, sessionStore }) {
    this.ollamaClient = ollamaClient;
    this.sessionStore = sessionStore;
  }

  async respond(sessionId, userText, options = {}) {
    const history = this.sessionStore.getHistory(sessionId);
    const nextHistory = [...history, { role: "user", content: userText }];
    const assistantText = await this.ollamaClient.reply(nextHistory, options.model);

    this.sessionStore.append(sessionId, { role: "user", content: userText });
    this.sessionStore.append(sessionId, { role: "assistant", content: assistantText });

    return assistantText;
  }
}
