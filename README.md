# echoLLM

`echoLLM` connects Telegram and WhatsApp messages to a local Ollama instance.

## What it does

- Polls Telegram for incoming messages and replies with Ollama output
- Exposes a WhatsApp Cloud API webhook for inbound messages
- Keeps a small in-memory chat history per conversation

## Requirements

- Node.js 20+
- A running local Ollama server at the default `OLLAMA_HOST`
- A Telegram bot token from BotFather
- For WhatsApp: Meta WhatsApp Cloud API credentials and a public webhook URL

## Setup

1. Copy `.env.example` to `.env`
2. Fill in the tokens and, if needed, the model name you want
3. Start Ollama locally
4. Run:

```bash
npm start
```

For TypeScript development, use:

```bash
npm run dev
```

To remove build output:

```bash
npm run clean
```

To fully reset generated artifacts and installed packages:

```bash
npm run clean:all
```

To reset and reinstall dependencies:

```bash
npm run reinstall
```

## Telegram

The Telegram adapter uses long polling, so it works locally without any public URL.
Commands:

- `/model` shows the current model and the available options
- `/model list` lists the available models
- `/model <name or number>` switches the current chat to another model
- `/reset` clears the conversation and the selected model

## WhatsApp

The WhatsApp adapter uses the Cloud API webhook flow:

- `GET /webhook/whatsapp` handles verification
- `POST /webhook/whatsapp` handles inbound messages

You must expose the server publicly for Meta to reach it.

## Notes

- History is stored in memory, so it resets when the process restarts.
- If only one adapter is configured, the other is skipped automatically.
- On startup, echoLLM discovers models from `ollama list` and falls back to the Ollama HTTP API if needed.
- If multiple models are installed and `OLLAMA_MODEL` is not set, echoLLM prompts you to pick one in the terminal.
- `OLLAMA_KEEP_ALIVE` defaults to `30m` so Ollama keeps the model warm between replies.
- If the selected model is large, response time will still be limited by the model itself; smaller models are much faster.
