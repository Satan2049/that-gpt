# Changelog

All notable changes to ChatNest are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-06-16

Major release focused on look-and-feel, mobile-ready layout, and agent features.

### Added

- **Design system** — Expanded tokens (spacing, radius, shadows, semantic colors) and Inter font loading
- **Branding** — In-app logo mark and refreshed shell layout
- **Mobile-ready sidebar** — Slide-over drawer with backdrop on narrow viewports (prep for Tauri mobile)
- **Markdown rendering** — Assistant messages render GFM markdown with syntax-highlighted code blocks
- **Stop generation** — Cancel in-flight streaming from the composer
- **Tool calling** — Agent loop with image, audio, and attachment analysis tools
- **Multimodal attachments** — Images, audio, text files, and PDFs
- **Regenerate** — Re-run the last assistant response
- **Copy** — Copy full messages or individual code blocks
- **Rename & search** — Rename conversations; debounced sidebar search
- **Optional image/audio models** — Separate model settings for vision and transcription

### Changed

- Composer uses a multi-line textarea (Enter to send, Shift+Enter for newline)
- Floating composer card with elevated surface styling
- Preset default label reflects in-app settings instead of `.env`
- Theme toggle moved to a compact header control; full theme choice remains in Settings

### Fixed

- Duplicate streaming cursor while content was already rendering
- Delete conversation now asks for confirmation
- Settings modal closes on Escape
- Removed unused `imageAttachmentLimits` module

## [1.1.0] - 2026-06-10

Feature release focused on daily-use polish.

### Added

- **Streaming responses** — Assistant messages render token-by-token with a live cursor
- **Settings: Test connection** — Validates API key and base URL against the provider
- **Settings: Model picker** — Refresh models from `/v1/models` with autocomplete
- **Conversation export** — Download active thread as Markdown (`.md`) or JSON (`.json`)
- **In-app settings (1.0 follow-up)** — All `.env` options editable from the Settings panel

### Changed

- Non-streaming providers fall back automatically when streaming is unsupported
- Error messages point users to Settings instead of manual `.env` editing

## [1.0.0] - 2026-06-10

First stable release of ChatNest as a local-first desktop application.

### Added

- **Desktop app (Tauri 2 + Rust)** — Native Windows shell with React UI
- **Local chat** — Persistent conversations stored as JSON in the app data directory
- **Prompt presets** — Reusable system prompts with model, temperature, and token limits
- **Vision support** — JPEG, PNG, and WebP image attachments with server-side validation
- **OpenAI-compatible API proxy** — API key stays in the Rust backend, not the webview
- **Themes** — Light and dark UI with persisted preference
- **Release verification** — `SHA256.txt`, `scripts/generate-sha256.ps1`, and [docs/TRUST.md](docs/TRUST.md)
- **Project docs** — README, CONTRIBUTING, SECURITY, and release packaging scripts

### Changed

- Migrated from the original Node.js/Fastify + React web stack to Rust + Tauri
- Rebranded from Chatterbox to **ChatNest** (`com.chatnest.desktop`)

### Technical

- Frontend communicates via Tauri `invoke` (no HTTP backend)
- Config: `%APPDATA%\com.chatnest.desktop\.env`
- Data: `%APPDATA%\com.chatnest.desktop\data\`

## [0.1.0] - Pre-release

Initial Tauri migration and internal testing builds. Superseded by **1.0.0**.

[1.1.0]: https://github.com/Satan2049/chat-nest/releases/tag/v1.1.0
[1.0.0]: https://github.com/Satan2049/chat-nest/releases/tag/v1.0.0
[0.1.0]: https://github.com/Satan2049/chat-nest/releases/tag/v0.1.0
