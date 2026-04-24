function readInt(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readString(value, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

export const config = {
  ollamaHost: readString(process.env.OLLAMA_HOST, "http://localhost:11434"),
  ollamaModel: readString(process.env.OLLAMA_MODEL),
  ollamaKeepAlive: readString(process.env.OLLAMA_KEEP_ALIVE, "30m"),
  chatSystemPrompt: readString(
    process.env.CHAT_SYSTEM_PROMPT,
    "You are a helpful assistant connected through echoLLM."
  ),
  telegramBotToken: readString(process.env.TELEGRAM_BOT_TOKEN),
  whatsappVerifyToken: readString(process.env.WHATSAPP_VERIFY_TOKEN),
  whatsappAccessToken: readString(process.env.WHATSAPP_ACCESS_TOKEN),
  whatsappPhoneNumberId: readString(process.env.WHATSAPP_PHONE_NUMBER_ID),
  port: readInt(process.env.PORT, 3000),
  sessionMaxMessages: readInt(process.env.SESSION_MAX_MESSAGES, 24)
};
