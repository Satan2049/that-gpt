<div align="center">

# Chatterbox

**Self-hosted chat UI for any OpenAI-compatible API**

Conversations and prompt presets stored as JSON on disk — no database.  
API keys stay on the server only.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=black)](client/)
[![Fastify](https://img.shields.io/badge/API-Fastify-000000?logo=fastify&logoColor=white)](server/)

[Features](#features) ·
[Quick start](#quick-start) ·
[Documentation](#documentation) ·
[Website](https://satan2049.github.io/chatter-box/)

</div>

<br />

<p align="center">
  <img src="docs/assets/app-preview.svg" alt="Chatterbox UI preview" width="720" />
</p>

<p align="center">
  <em>Sidebar conversations, prompt presets, vision attachments, and light/dark theme.</em>
</p>

---

## Why Chatterbox?

Run a minimal ChatGPT-style interface on your own machine. Point it at OpenAI, an Azure OpenAI proxy, Ollama with an OpenAI shim, or any compatible endpoint. History lives in plain JSON files you can copy, diff, or delete—no cloud account for storage.

| | |
|---|---|
| **Privacy** | Provider API key never ships to the browser |
| **Simplicity** | Fastify + React, file storage, no ORM |
| **Flexibility** | Per-preset model, temperature, and system prompt |

## Features

- **Text chat** with conversation history (`server/data/chats/`)
- **Vision** — attach JPEG, PNG, or WebP images with messages
- **Prompt presets** — model, temperature, and system prompt per preset
- **Themes** — light / dark mode (saved in the browser)
- **Errors** — clear messages for timeouts, rate limits, invalid keys, and network issues

## Architecture

```
client/   React + Vite + Zustand  →  proxies /api to server
server/   Fastify + TypeScript     →  file storage + AI proxy
```

The browser never sees your `AI_API_KEY`. All provider calls go through the local backend.

## Quick start

**Prerequisites:** [Node.js](https://nodejs.org/) 20+ and an API key for an OpenAI-compatible provider.

```bash
git clone https://github.com/Satan2049/chatter-box.git
cd chatter-box

npm install --prefix server
npm install --prefix client

cp server/.env.example server/.env
# Edit server/.env — set AI_API_KEY
```

```bash
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

See [`server/.env.example`](server/.env.example) for a copy-paste template.

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

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET/POST/PATCH/DELETE` | `/api/chat/conversations` | Conversation CRUD |
| `POST` | `/api/chat/send` | Send message (+ optional images), receive reply |
| `GET/POST/PUT/DELETE` | `/api/prompts` | Prompt preset CRUD |

Full contracts: [`docs/master_plan.md`](docs/master_plan.md).

## Documentation

| Resource | Description |
|----------|-------------|
| [Project website](https://satan2049.github.io/chatter-box/) | Landing page (GitHub Pages) |
| [`docs/master_plan.md`](docs/master_plan.md) | API and implementation plan |
| [`docs/stages.md`](docs/stages.md) | Development stages and exit criteria |

### Enable GitHub Pages

1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment**
3. Source: **Deploy from a branch**
4. Branch: `main` / folder: **`/docs`**
5. Save — the site will be at `https://<username>.github.io/chatter-box/`

## Development

```bash
npm run test
npm run build:server
npm run build:client
```

## Security notes

- Do not commit `server/.env` or real API keys.
- This app has **no authentication**; run it only on localhost or behind your own access controls.
- Image uploads are validated (type, size, count) on the server.

## License

MIT — see [LICENSE](LICENSE).
