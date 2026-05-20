# Chatterbox

A small, self-hosted chat UI that talks to any **OpenAI-compatible** API. Conversations and prompt presets are stored as JSON files on disk—no database required. API keys stay on the server only.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- Text chat with conversation history (persisted under `server/data/chats/`)
- Vision: send JPEG, PNG, or WebP images with messages
- Prompt presets with per-preset model, temperature, and system prompt
- Light / dark theme (saved in the browser)
- Friendly errors for timeouts, rate limits, invalid keys, and network issues

## Architecture

```
client/   React + Vite + Zustand  →  proxies /api to server
server/   Fastify + TypeScript     →  file storage + AI proxy
```

The browser never sees your `AI_API_KEY`. All provider calls go through the local backend.

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- An API key for an OpenAI-compatible provider (OpenAI, Azure OpenAI proxy, Ollama with OpenAI shim, etc.)

## Quick start

```bash
# Install dependencies
npm install --prefix server
npm install --prefix client

# Configure the server
cp server/.env.example server/.env
# Edit server/.env and set AI_API_KEY

# Terminal 1 — API (default http://127.0.0.1:3001)
npm run dev:server

# Terminal 2 — UI (default http://127.0.0.1:5173)
npm run dev:client
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173), create a conversation, pick a prompt preset, and send a message.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server listen port |
| `AI_API_KEY` | — | Provider API key (required for chat) |
| `AI_BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible base URL |
| `AI_MODEL` | `gpt-4o-mini` | Default model id |
| `AI_DEFAULT_SYSTEM_PROMPT` | *(empty)* | Fallback system prompt |
| `AI_REQUEST_TIMEOUT_MS` | `60000` | Per-request timeout |
| `AI_MAX_RETRIES` | `2` | Retries on transient failures |

See `server/.env.example` for a copy-paste template.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:server` | Start API with hot reload |
| `npm run dev:client` | Start Vite dev server |
| `npm run build:server` | Compile server to `server/dist/` |
| `npm run build:client` | Production UI build |
| `npm run test` | Run server unit tests |

Production server: `npm run build:server` then `npm --prefix server run start` (from `server/` with `.env` present).

## Data layout

```
server/data/
  chats/     one JSON file per conversation
  prompts/   one JSON file per prompt preset
```

User chat files are gitignored by default. Only `.gitkeep` placeholders are tracked.

## API overview

- `GET /health` — health check
- `GET|POST|PATCH|DELETE /api/chat/conversations` — conversation CRUD
- `POST /api/chat/send` — send user message (+ optional images), receive assistant reply
- `GET|POST|PUT|DELETE /api/prompts` — prompt preset CRUD

Full contracts are documented in `docs/master_plan.md`.

## Development

```bash
npm run test
npm run build:server
npm run build:client
```

Implementation stages and exit criteria: `docs/stages.md`.

## Security notes

- Do not commit `server/.env` or real API keys.
- This app has **no authentication**; run it only on localhost or behind your own access controls.
- Image uploads are validated (type, size, count) on the server.

## License

MIT — see [LICENSE](LICENSE).
