import { error as logError, info, warn } from "./logger.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class TelegramBot {
  constructor({ token, chatService, modelOptions, defaultModel }) {
    this.token = token;
    this.chatService = chatService;
    this.modelOptions = modelOptions;
    this.defaultModel = defaultModel;
    this.offset = 0;
    this.running = false;
  }

  get apiBase() {
    return `https://api.telegram.org/bot${this.token}`;
  }

  async sendMessage(chatId, text) {
    const response = await fetch(`${this.apiBase}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Telegram sendMessage failed: ${response.status} ${body}`);
    }
  }

  async sendChatAction(chatId, action = "typing") {
    const response = await fetch(`${this.apiBase}/sendChatAction`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        action
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Telegram sendChatAction failed: ${response.status} ${body}`);
    }
  }

  async pollOnce() {
    const response = await fetch(`${this.apiBase}/getUpdates`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        offset: this.offset,
        timeout: 25,
        allowed_updates: ["message"]
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Telegram getUpdates failed: ${response.status} ${body}`);
    }

    const data = await response.json();
    const updates = Array.isArray(data?.result) ? data.result : [];

    for (const update of updates) {
      this.offset = Math.max(this.offset, update.update_id + 1);
      await this.handleUpdate(update);
    }
  }

  async handleUpdate(update) {
    const message = update?.message;
    const text = message?.text?.trim();
    const chatId = message?.chat?.id;

    if (!chatId || !text) {
      return;
    }

    if (text === "/start") {
      await this.sendMessage(chatId, "echoLLM is ready. Send me a message and I’ll ask Ollama.");
      return;
    }

    if (text === "/reset") {
      this.chatService.sessionStore.reset(`telegram:${chatId}`);
      await this.sendMessage(chatId, "Conversation reset.");
      return;
    }

    if (text.startsWith("/model")) {
      await this.handleModelCommand(chatId, text);
      return;
    }

    let typingTimer;
    try {
      typingTimer = setInterval(() => {
        this.sendChatAction(chatId).catch(() => {});
      }, 4500);

      await this.sendChatAction(chatId);

      const selectedModel =
        this.chatService.sessionStore.getSelectedModel(`telegram:${chatId}`) ?? this.defaultModel;
      const reply = await this.chatService.respond(`telegram:${chatId}`, text, {
        model: selectedModel
      });
      await this.sendMessage(chatId, reply);
    } catch (err) {
      logError("Telegram reply failed", { chatId, error: err?.message ?? err });
      await this.sendMessage(chatId, "Sorry, I could not reach Ollama just now.");
    } finally {
      if (typingTimer) {
        clearInterval(typingTimer);
      }
    }
  }

  formatModelList() {
    return this.modelOptions.map((option, index) => `${index + 1}. ${option.label}`).join("\n");
  }

  resolveModelChoice(rawChoice) {
    const choice = rawChoice.trim();
    if (!choice) {
      return null;
    }

    const numeric = Number.parseInt(choice, 10);
    if (Number.isFinite(numeric)) {
      return this.modelOptions[numeric - 1] ?? null;
    }

    return this.modelOptions.find((option) => option.value === choice || option.label === choice) ?? null;
  }

  async handleModelCommand(chatId, text) {
    const parts = text.split(/\s+/);
    const arg = parts.slice(1).join(" ").trim();
    const sessionId = `telegram:${chatId}`;
    const currentModel = this.chatService.sessionStore.getSelectedModel(sessionId) ?? this.defaultModel;

    if (!arg) {
      await this.sendMessage(
        chatId,
        `Current model: ${currentModel}\n\nAvailable models:\n${this.formatModelList()}\n\nUse /model <name or number> to switch.`
      );
      return;
    }

    if (arg.toLowerCase() === "list") {
      await this.sendMessage(chatId, `Available models:\n${this.formatModelList()}`);
      return;
    }

    const selected = this.resolveModelChoice(arg);
    if (!selected) {
      await this.sendMessage(
        chatId,
        `I could not find "${arg}".\n\nAvailable models:\n${this.formatModelList()}`
      );
      return;
    }

    this.chatService.sessionStore.setSelectedModel(sessionId, selected.value);
    await this.sendMessage(chatId, `Switched to ${selected.label}.`);
  }

  async start() {
    if (this.running) {
      return;
    }

    this.running = true;
    info("Telegram polling started");

    while (this.running) {
      try {
        await this.pollOnce();
      } catch (err) {
        warn("Telegram polling error", { error: err?.message ?? err });
        await sleep(3000);
      }
    }
  }

  stop() {
    this.running = false;
  }
}
