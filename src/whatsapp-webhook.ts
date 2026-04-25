import { info } from "./logger.js";
import type { ChatService } from "./chat-service.js";
import type { IncomingMessage, ServerResponse } from "node:http";

function jsonResponse(res: ServerResponse, statusCode: number, body: unknown): void {
  res.writeHead(statusCode, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

interface WhatsAppPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from?: string;
          text?: {
            body?: string;
          };
        }>;
      };
    }>;
  }>;
}

export class WhatsAppWebhook {
  constructor(
    private readonly deps: {
      verifyToken: string;
      accessToken: string;
      phoneNumberId: string;
      chatService: ChatService;
    }
  ) {}

  async sendMessage(to: string, text: string): Promise<void> {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${this.deps.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.deps.accessToken}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: text }
        })
      }
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`WhatsApp sendMessage failed: ${response.status} ${body}`);
    }
  }

  handleVerification(_req: IncomingMessage, res: ServerResponse, url: URL): boolean {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === this.deps.verifyToken) {
      info("WhatsApp webhook verified");
      res.writeHead(200, { "content-type": "text/plain" });
      res.end(challenge ?? "");
      return true;
    }

    res.writeHead(403, { "content-type": "text/plain" });
    res.end("Verification failed");
    return true;
  }

  async handleIncoming(_req: IncomingMessage, res: ServerResponse, rawBody: string): Promise<void> {
    const payload = JSON.parse(rawBody || "{}") as WhatsAppPayload;
    const entries = Array.isArray(payload?.entry) ? payload.entry : [];

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const change of changes) {
        const value = change?.value;
        const messages = Array.isArray(value?.messages) ? value.messages : [];

        for (const message of messages) {
          const from = message?.from;
          const text = message?.text?.body?.trim();

          if (!from || !text) {
            continue;
          }

          if (text === "/reset") {
            this.deps.chatService.sessionStore.reset(`whatsapp:${from}`);
            await this.sendMessage(from, "Conversation reset.");
            continue;
          }

          const reply = await this.deps.chatService.respond(`whatsapp:${from}`, text);
          await this.sendMessage(from, reply);
        }
      }
    }

    jsonResponse(res, 200, { ok: true });
  }
}
