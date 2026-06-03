<div align="center">

<img src="docs/assets/brand-mark.svg" alt="" width="40" height="40" />

# Chatterbox

**Self-hosted chat for OpenAI-compatible APIs**

<p>
  <a href="https://satan2049.github.io/chatter-box/">Website</a>
  &nbsp;·&nbsp;
  <a href="#quick-start">Quick start</a>
  &nbsp;·&nbsp;
  <a href="#features">Features</a>
  &nbsp;·&nbsp;
  <a href="#documentation">Docs</a>
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-3f6fff?style=flat-square)](LICENSE)
[![Node](https://img.shields.io/badge/Node-%3E%3D20-3f6fff?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3f6fff?style=flat-square&logo=typescript&logoColor=white)](server/)
[![React](https://img.shields.io/badge/React-Vite-3f6fff?style=flat-square&logo=react&logoColor=white)](client/)
[![Fastify](https://img.shields.io/badge/Fastify-API-3f6fff?style=flat-square&logo=fastify&logoColor=white)](server/)

</div>

<br />

<table>
<tr>
<td width="58%">

### Overview

Chatterbox is a local-first chat client and API proxy. The React UI handles conversations, prompt presets, and optional image attachments. A Fastify backend stores data as JSON and forwards requests to your configured provider.

**Design goals:** keep provider credentials on the server, avoid database overhead, and support any OpenAI-compatible endpoint.

</td>
<td>

<p align="center">
  <img src="docs/assets/app-preview.svg" alt="Chatterbox interface preview" width="100%" />
</p>

<p align="center"><sub>Conversation sidebar · preset panel · message thread</sub></p>

</td>
</tr>
</table>

---

## Features

| Area | Details |
|------|---------|
| **Chat** | Persistent threads under `server/data/chats/` |
| **Vision** | JPEG, PNG, WebP attachments with server-side validation |
| **Presets** | Per-preset model, temperature, and system prompt |
| **Theming** | Light / dark UI aligned with in-app CSS variables |
| **Errors** | Structured handling for timeouts, rate limits, and auth failures |

## Architecture

```
Browser (React + Vite)
        │  /api/*
        ▼
Fastify (TypeScript) ──► OpenAI-compatible provider
        │
        └── JSON files: server/data/chats/ · server/data/prompts/
```

The browser never receives `AI_API_KEY`. All provider traffic is proxied through the backend.

## Quick start

**Requirements:** Node.js 20+, API key for an OpenAI-compatible service.

```bash
git clone https://github.com/Satan2049/chatter-box.git
cd chatter-box

npm install --prefix server
npm install --prefix client

cp server/.env.example server/.env
# Set AI_API_KEY in server/.env
```

```bash
npm run dev:server   # API  → http://127.0.0.1:3001
npm run dev:client   # UI   → http://127.0.0.1:5173
```

Open the UI, create a conversation, select a prompt preset, and send a message.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server listen port |
| `AI_API_KEY` | — | Provider API key (required) |
| `AI_BASE_URL` | `https://api.openai.com/v1` | Compatible API base URL |
| `AI_MODEL` | `gpt-4o-mini` | Default model identifier |
| `AI_DEFAULT_SYSTEM_PROMPT` | *(empty)* | Fallback system prompt |
| `AI_REQUEST_TIMEOUT_MS` | `60000` | Request timeout (ms) |
| `AI_MAX_RETRIES` | `2` | Retries on transient errors |

Template: [`server/.env.example`](server/.env.example)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:server` | API with hot reload |
| `npm run dev:client` | Vite development server |
| `npm run build:server` | Compile to `server/dist/` |
| `npm run build:client` | Production UI build |
| `npm run test` | Server unit tests |

**Production:** `npm run build:server`, then `npm --prefix server run start` with `server/.env` in place.

## Data layout

```
server/data/
  chats/      one JSON file per conversation
  prompts/    one JSON file per prompt preset
```

User-generated chat data is gitignored; only `.gitkeep` placeholders are tracked.

## API

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Health check |
| `GET/POST/PATCH/DELETE` | `/api/chat/conversations` | Conversation CRUD |
| `POST` | `/api/chat/send` | Send message (optional images) |
| `GET/POST/PUT/DELETE` | `/api/prompts` | Prompt preset CRUD |

Contract reference: [`docs/master_plan.md`](docs/master_plan.md)

## Documentation

| Resource | Description |
|----------|-------------|
| [Project site](https://satan2049.github.io/chatter-box/) | Landing page (GitHub Pages, `/docs`) |
| [`docs/master_plan.md`](docs/master_plan.md) | API and implementation specification |
| [`docs/stages.md`](docs/stages.md) | Delivery stages and exit criteria |

<details>
<summary>Enable GitHub Pages</summary>

1. Repository **Settings → Pages**
2. Source: deploy from branch **`main`**, folder **`/docs`**
3. Site URL: `https://<username>.github.io/chatter-box/`

</details>

## Development

```bash
npm run test
npm run build:server
npm run build:client
```

## Security

- Do not commit `server/.env` or production API keys.
- **No built-in authentication** — restrict access via network policy or a reverse proxy.
- Uploads are validated for MIME type, size, and count on the server.

## License

[MIT](LICENSE)
