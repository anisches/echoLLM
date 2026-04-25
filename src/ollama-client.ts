import { error as logError } from "./logger.js";
import type { ChatMessage } from "./types.js";

interface OllamaChatResponse {
  message?: {
    content?: string;
  };
}

export class OllamaClient {
  private readonly baseUrl: string;

  private readonly model: string;

  private readonly systemPrompt: string;

  private readonly keepAlive: string;

  constructor({
    baseUrl,
    model,
    systemPrompt,
    keepAlive
  }: {
    baseUrl: string;
    model: string;
    systemPrompt: string;
    keepAlive: string;
  }) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.model = model;
    this.systemPrompt = systemPrompt;
    this.keepAlive = keepAlive;
  }

  async reply(messages: ChatMessage[], modelOverride?: string): Promise<string> {
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

    const data = (await response.json()) as OllamaChatResponse;
    const content = data?.message?.content?.trim();

    if (!content) {
      throw new Error("Ollama returned an empty assistant message");
    }

    return content;
  }
}
