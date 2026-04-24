import { error as logError } from "./logger.js";

export class OllamaClient {
  constructor({ baseUrl, model, systemPrompt, keepAlive }) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.model = model;
    this.systemPrompt = systemPrompt;
    this.keepAlive = keepAlive;
  }

  async reply(messages, modelOverride) {
    const payload = {
      model: modelOverride ?? this.model,
      stream: false,
      keep_alive: this.keepAlive,
      messages: [{ role: "system", content: this.systemPrompt }, ...messages]
    };

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.text();
      logError("Ollama chat request failed", { status: response.status, body });
      throw new Error(`Ollama request failed with status ${response.status}`);
    }

    const data = await response.json();
    const content = data?.message?.content?.trim();

    if (!content) {
      throw new Error("Ollama returned an empty assistant message");
    }

    return content;
  }
}
