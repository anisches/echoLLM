import { info } from "./logger.js";

function jsonResponse(res, statusCode, body) {
  res.writeHead(statusCode, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

export class WhatsAppWebhook {
  constructor({ verifyToken, accessToken, phoneNumberId, chatService }) {
    this.verifyToken = verifyToken;
    this.accessToken = accessToken;
    this.phoneNumberId = phoneNumberId;
    this.chatService = chatService;
  }

  async sendMessage(to, text) {
    const response = await fetch(`https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text }
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`WhatsApp sendMessage failed: ${response.status} ${body}`);
    }
  }

  handleVerification(req, res, url) {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === this.verifyToken) {
      info("WhatsApp webhook verified");
      res.writeHead(200, { "content-type": "text/plain" });
      res.end(challenge ?? "");
      return true;
    }

    res.writeHead(403, { "content-type": "text/plain" });
    res.end("Verification failed");
    return true;
  }

  async handleIncoming(req, res, rawBody) {
    const payload = JSON.parse(rawBody || "{}");
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
            this.chatService.sessionStore.reset(`whatsapp:${from}`);
            await this.sendMessage(from, "Conversation reset.");
            continue;
          }

          const reply = await this.chatService.respond(`whatsapp:${from}`, text);
          await this.sendMessage(from, reply);
        }
      }
    }

    jsonResponse(res, 200, { ok: true });
  }
}

