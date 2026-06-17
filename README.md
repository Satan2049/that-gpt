<div align="center">

<img src="assets/logo.svg" alt="ChatNest logo" width="96" height="96" />

# ChatNest

**Local-first desktop chat for OpenAI-compatible APIs**

[![Version](https://img.shields.io/badge/version-2.0.0-3f6fff?style=flat-square)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-3f6fff?style=flat-square)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2-3f6fff?style=flat-square&logo=tauri&logoColor=white)](src-tauri/)
[![Rust](https://img.shields.io/badge/Rust-2021-3f6fff?style=flat-square&logo=rust&logoColor=white)](src-tauri/)
[![React](https://img.shields.io/badge/React-18-3f6fff?style=flat-square&logo=react&logoColor=white)](client/)
[![Platform](https://img.shields.io/badge/Platform-Windows-3f6fff?style=flat-square&logo=windows&logoColor=white)](#installation)

[Features](#features) · [Screenshots](#screenshots) · [Installation](#installation) · [Development](#development) · [Build](#build) · [Changelog](CHANGELOG.md) · [Trust](#trust) · [Contributing](CONTRIBUTING.md)

**[Landing page](https://satan2049.github.io/chat-nest/)** · **[v2.0.0 release notes](docs/RELEASE_v2.0.0.md)**

<img src="assets/banner.png" alt="ChatNest banner" width="100%" />

</div>

---

## Description

ChatNest **v2** is an open-source **Windows desktop** chat client. Conversations, prompt presets, and multimodal attachments live in a redesigned React UI. A **Rust + Tauri** backend stores JSON on disk and proxies all model requests so your API key never enters the webview.

**Design goals:** credentials stay in the desktop shell, no database overhead, any OpenAI-compatible endpoint.

## Features

| | |
|---|---|
| **Chat** | Persistent threads stored locally as JSON |
| **Markdown** | GFM rendering with syntax-highlighted code blocks |
| **Agent tools** | Tool-calling loop; stop or regenerate responses |
| **Attachments** | Images, audio, text files, and PDFs |
| **Vision** | JPEG, PNG, WebP with server-side validation |
| **Presets** | Reusable system prompts with model, temperature, and token limits |
| **Themes** | Light / dark UI with design tokens and Inter typography |
| **Layout** | Responsive drawer on narrow windows; full sidebar on desktop |
| **Reliability** | Retries, timeouts, and clear errors for provider failures |
| **Settings UI** | API key, provider URL, models, timeout — all editable in-app |
| **Streaming** | Assistant replies appear token-by-token |
| **Export** | Download conversations as Markdown or JSON |

## Screenshots

<table>
<tr>
<td width="33%"><img src="assets/screenshots/screenshot-chat.png" alt="Chat view" width="100%" /><br /><sub>Main chat</sub></td>
<td width="33%"><img src="assets/screenshots/screenshot-presets.png" alt="Prompt presets" width="100%" /><br /><sub>Prompt presets</sub></td>
<td width="33%"><img src="assets/screenshots/screenshot-dark.png" alt="Dark theme" width="100%" /><br /><sub>Dark theme</sub></td>
</tr>
</table>

<p align="center">
  <img src="assets/screenshots/demo.gif" alt="ChatNest demo" width="720" />
  <br />
  <sub>Demo GIF</sub>
</p>

## Installation

### Download (recommended)

1. Open **[GitHub Releases — v2.0.0](https://github.com/Satan2049/chat-nest/releases/tag/v2.0.0)**.
2. Download **portable** `.exe` or **NSIS setup** installer for Windows x64.
3. Verify checksums — [`SHA256.txt`](SHA256.txt) and [docs/TRUST.md](docs/TRUST.md).
4. *(Optional)* Review [VirusTotal reports (v2.0.0)](docs/TRUST.md#published-reports-v200).

### Configure API access

Open **Settings** in the app (header) to set your API key, base URL, default model, system prompt, timeout, and retries. Settings are saved to:

```text
%APPDATA%\com.chatnest.desktop\.env
```

You can also edit that file manually — see [`src-tauri/.env.example`](src-tauri/.env.example):

```env
AI_API_KEY=your-key-here
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
AI_DEFAULT_SYSTEM_PROMPT=You are a helpful assistant.
AI_REQUEST_TIMEOUT_MS=60000
AI_MAX_RETRIES=2
```

### Build from source

Requires Node.js 20+, Rust, and [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) on Windows.

```bash
git clone https://github.com/Satan2049/chat-nest.git
cd chat-nest
npm install
npm run build
```

Portable binary: `src-tauri/target/release/bundle/portable/ChatNest.exe`

## Development

```bash
npm install
npm run dev          # Tauri + Vite hot reload
npm run test:rust    # Rust unit tests
npm run build:client # Frontend only
npm run clean        # Remove build artifacts & temp files
```

Config template: [`src-tauri/.env.example`](src-tauri/.env.example)

| Variable | Description |
|----------|-------------|
| `AI_API_KEY` | Provider API key (required) |
| `AI_BASE_URL` | OpenAI-compatible base URL |
| `AI_MODEL` | Default model id |
| `AI_DEFAULT_SYSTEM_PROMPT` | Fallback system message for new chats |
| `AI_REQUEST_TIMEOUT_MS` | Provider request timeout (ms) |
| `AI_MAX_RETRIES` | Retry count for transient API errors |

See [CONTRIBUTING.md](CONTRIBUTING.md) for pull request guidelines.

## Build

### Windows desktop

| Command | Output |
|---------|--------|
| `npm run build` | NSIS installer + portable EXE |
| `npm run build:portable` | Portable EXE only |
| `npm run release:package` | Stage `release/` folder with ZIPs |
| `npm run release:hashes` | Regenerate `SHA256.txt` from built artifacts |
| `npm run clean` | Delete `target/`, `client/dist/`, caches, logs |
| `npm run clean:all` | Also remove `node_modules`, `release/`, Android gen |

Artifacts:

```text
src-tauri/target/release/bundle/portable/ChatNest.exe
src-tauri/target/release/bundle/nsis/ChatNest_*_x64-setup.exe
release/                                    # after release:package
SHA256.txt                                  # after release:hashes
```

## Architecture

```text
React UI (Vite)
      │  Tauri invoke
      ▼
Rust services ──► OpenAI-compatible API
      │
      └── JSON: %APPDATA%/com.chatnest.desktop/data/
```

Details: [`docs/repository-intelligence.md`](docs/repository-intelligence.md)

## Tech stack

| Layer | Technology |
|-------|------------|
| Desktop shell | [Tauri 2](https://v2.tauri.app/) |
| Backend | Rust, Tokio, Reqwest, Serde |
| Frontend | React 18, Vite, TypeScript, Zustand |
| Storage | File-based JSON |
| AI | OpenAI-compatible `/chat/completions` |

## Trust

- Verify downloads: [docs/TRUST.md](docs/TRUST.md)
- v2.0.0 VirusTotal: [NSIS](https://www.virustotal.com/gui/file/b5bacd8762a769ba8456ea96ee227d0d18875a202ab061b4fb10745990e4552f?nocache=1) · [Portable](https://www.virustotal.com/gui/file/752ab6ebc466319fad186549fdb9a1a23c155f38dd6ade6bf07846b1886c3d74?nocache=1)
- Report security issues: [SECURITY.md](SECURITY.md)
- Checksums: [`SHA256.txt`](SHA256.txt)

## License

[MIT](LICENSE) © ChatNest contributors
