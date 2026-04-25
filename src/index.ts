import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { config } from "./config.js";
import { info, warn } from "./logger.js";
import { SessionStore } from "./session-store.js";
import { OllamaClient } from "./ollama-client.js";
import { discoverOllamaModels, mapModelsToOptions } from "./ollama-models.js";
import { ChatService } from "./chat-service.js";
import { TelegramBot } from "./telegram-bot.js";
import { WhatsAppWebhook } from "./whatsapp-webhook.js";
import { createServer } from "./http-server.js";
import type { ModelOption } from "./types.js";

async function chooseModel(modelOptions: ModelOption[], preferredModel: string): Promise<ModelOption> {
  if (preferredModel) {
    const preferredOption = modelOptions.find((option) => option.value === preferredModel);
    if (preferredOption) {
      return preferredOption;
    }
    warn(`OLLAMA_MODEL "${preferredModel}" was not found in ollama list; prompting instead`);
  }

  if (modelOptions.length === 1) {
    return modelOptions[0];
  }

  if (!input.isTTY) {
    warn("No terminal prompt available, falling back to the first discovered Ollama model");
    return modelOptions[0];
  }

  const rl = readline.createInterface({ input, output });

  try {
    output.write("\nAvailable Ollama models:\n");
    modelOptions.forEach((option, index) => {
      output.write(`  ${index + 1}. ${option.label}\n`);
    });

    const answer = await rl.question(`Choose a model [1-${modelOptions.length}] (default 1): `);
    const parsed = Number.parseInt(answer.trim(), 10);
    const index = Number.isFinite(parsed) ? parsed - 1 : 0;

    return modelOptions[Math.min(Math.max(index, 0), modelOptions.length - 1)];
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  const sessionStore = new SessionStore(config.sessionMaxMessages);
  const discoveredModels = await discoverOllamaModels(config.ollamaHost);
  const modelOptions = mapModelsToOptions(discoveredModels);

  if (modelOptions.length === 0) {
    throw new Error(
      `No Ollama models found. Make sure Ollama is running and try \`ollama list\` again.`
    );
  }

  const selectedOption = await chooseModel(modelOptions, config.ollamaModel);
  const selectedModel = selectedOption.value;
  const ollamaClient = new OllamaClient({
    baseUrl: config.ollamaHost,
    model: selectedModel,
    systemPrompt: config.chatSystemPrompt,
    keepAlive: config.ollamaKeepAlive
  });
  const chatService = new ChatService({ ollamaClient, sessionStore });

  let whatsappWebhook: WhatsAppWebhook | null = null;
  if (config.whatsappVerifyToken && config.whatsappAccessToken && config.whatsappPhoneNumberId) {
    whatsappWebhook = new WhatsAppWebhook({
      verifyToken: config.whatsappVerifyToken,
      accessToken: config.whatsappAccessToken,
      phoneNumberId: config.whatsappPhoneNumberId,
      chatService
    });
    info("WhatsApp webhook enabled");
  } else {
    warn("WhatsApp webhook disabled because one or more credentials are missing");
  }

  await createServer({
    port: config.port,
    whatsappWebhook
  });

  if (config.telegramBotToken) {
    const telegramBot = new TelegramBot({
      token: config.telegramBotToken,
      chatService,
      modelOptions,
      defaultModel: selectedModel
    });

    void telegramBot.start().catch((err: unknown) => {
      warn("Telegram polling stopped unexpectedly", {
        error: err instanceof Error ? err.message : err
      });
    });
  } else {
    warn("Telegram polling disabled because TELEGRAM_BOT_TOKEN is missing");
  }

  info("Discovered Ollama model options", modelOptions);
  info(`echoLLM is running with Ollama model "${selectedModel}"`, selectedOption);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
