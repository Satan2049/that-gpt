# Changelog

All notable changes to ThatGPT are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.6.2] - 2026-06-20

Release notes: [docs/RELEASE_v2.6.2.md](docs/RELEASE_v2.6.2.md) · Fork builds: [docs/FORK_BUILDS.md](docs/FORK_BUILDS.md) · Mobile: [docs/MOBILE_BUILD.md](docs/MOBILE_BUILD.md)

**Mobile (Phase 1–3) + desktop** — Android/iOS simulator builds, dedicated mobile shell, polish for touch/RTL/back navigation.

### Added

- Tauri Android target (`com.thatgpt.app`) with `tauri android init` scripts
- Platform configs: `tauri.android.conf.json`, `tauri.ios.conf.json`
- Mobile capability: `src-tauri/capabilities/mobile.json`
- npm scripts: `android:init`, `android:build`, `ios:init`, `ios:build:sim`
- GitHub Actions: `mobile-ci.yml`, `mobile-release.yml`
- Android manifest patches (mic, notifications) via `scripts/patch-android-manifest.mjs`
- **MobileShell** — bottom tab navigation (Chats, Projects, Library, More)
- `useShellLayout` — auto-detect mobile (Tauri Android/iOS, narrow viewport, touch)
- `mobile.css` — safe areas, touch-first UI, full-screen settings/search
- **Phase 3 polish:** bottom sheets for message actions, Android back button stack, RTL mobile layout, library cards, compact project workspace
- Release docs: `RELEASE_v2.6.2.md`, `FORK_BUILDS.md` (VirusTotal link placeholders)

### Notes

- Android ships **debug-signed APK** for sideload + **unsigned release APK** for manual signing
- iOS ships **simulator `.app` zip** only (no App Store / TestFlight signing)

## [2.6.1] - 2026-06-20

Release notes: [docs/RELEASE_v2.6.1.md](docs/RELEASE_v2.6.1.md)

**Cross-platform desktop** — Windows, macOS (Apple Silicon), and Linux via GitHub Actions.

### Added

- **Voice input** — Hold-to-talk mic in composer; browser speech recognition with Whisper API fallback
- **OS credential storage** — API keys in Windows Credential Manager / macOS Keychain / Linux secret service
- **GitHub Actions CI** — Rust tests, client build, Tauri matrix (Windows, macOS, Linux)
- **GitHub Actions release** — Tagged releases with platform bundles + SHA256 checksums
- **Settings toggle** — Notify when response completes (unfocused window only)

### Changed

- User message bubbles use logo purple instead of green
- Message ⋯ dropdown anchors correctly on assistant/user messages
- j/k message navigation scrolls focused message into view
- Update check uses semver comparison

### Fixed

- Notifications fire only after successful generation (not on error/cancel)
- Notification icon path (`/logo.svg`)
- Retry button i18n (EN/FA)
- Message edit/retry buttons visible again (CSS regression)
- Global button styles no longer inflate compact icon/action buttons

## [2.5.0] - 2026-06-20

Release notes: [docs/RELEASE_v2.5.0.md](docs/RELEASE_v2.5.0.md)

**Windows desktop only.** First GitHub-ready release after the full ThatGPT roadmap (Phases 0–6).

### Added

- **Persian & English UI** — Full interface i18n, RTL layout, onboarding on first launch
- **Projects (ChatGPT-style)** — Instructions, sources, new chat in project, settings modal
- **ChatGPT-like chat list** — Context menu (share, rename, move to project, pin, archive, delete)
- **Multi-provider profiles** — OpenAI-compatible APIs and Ollama with test connection
- **Header model selector** — Capability badges (Vision, Image Gen, Tools, Reasoning, Embedding, Audio)
- **Token usage & cost** — Footer stats, context bar, editable model prices
- **Slash commands** — `/new`, `/clear`, `/model`, `/export`, `/temp`, `/help`, `/prompt`
- **Library page** — Attachment index with filters
- **Local knowledge base (RAG)** — Chunking, embeddings, citations `[1]` in replies
- **Agent tools** — `web_search`, `search_knowledge_base`, `generate_image` (image-gen models)
- **Conversation management** — Ctrl+K search, pin, archive, folders, ephemeral chat
- **Productivity** — Bookmarks, fork, branching, templates, HTML share, command palette
- **Usage analytics** — Token history in Settings → Storage
- **Polish** — Skeleton loaders, j/k navigation, notifications, update check, confirm modals
- **Empty chat** — Logo + suggestion chips; export overflow menu

### Changed

- **UI polish** — ChatGPT-style spacing, colors, compact message actions, simplified Settings (Advanced tab)
- Rust package renamed `chat-nest` → `that-gpt` (`ThatGPT.exe` in Task Manager)
- Removed right-side branches panel; alternates shown inline on messages
- Screenshots and demo media documented under `docs/screenshots/`
- Landing page and README updated for v2.5.0

### Fixed

- Model selector refresh button overflowing the dropdown
- Sidebar and chat scroll containers (no overlapping lists / content under sidebar)
- Bookmark filter trap when no bookmarked messages (Show all exit)
- Image generation vs vision model routing (separate capabilities)
- Theme localStorage migration from legacy `chatnest-theme`

## [2.2.0] - 2026-06-20

Release notes: [docs/RELEASE_v2.2.0.md](docs/RELEASE_v2.2.0.md)

**Windows desktop only.** Linux and macOS planned later.

### Added

- **ThatGPT rebrand** — Chat bubble + T logo, `com.thatgpt.desktop`, ChatGPT-inspired shell
- **True SSE streaming** — Live token streaming from OpenAI-compatible APIs
- **Smart scroll lock** — Stick-to-bottom only when near bottom; “↓ New messages” chip
- **LaTeX & Mermaid** — KaTeX math and Mermaid diagram rendering in assistant messages
- **Input polish** — Drag-and-drop attachments, paste images, per-conversation draft persistence
- **Toasts** — Copy feedback for messages and code blocks
- **Personality presets** — Parody tone chips in Settings → Personalization
- **Keyboard shortcuts** — Ctrl+K search, Ctrl+Shift+O new chat
- **Legacy data migration** — Copies `%APPDATA%\com.chatnest.desktop\` on first launch
- **Sidebar expand** — Header button restores collapsed sidebar; state persisted in localStorage

### Changed

- Default theme is dark; settings reorganized into tabbed modal
- Prompt presets moved to Settings → Personalization
- Config path: `%APPDATA%\com.thatgpt.desktop\.env`

### Removed

- Mobile shell, Android/iOS targets, Codemagic CI, `MobileShell` component

## [2.0.0] - 2026-06-17

Major **Windows desktop** release: redesigned UI, agent tooling, and richer chat workflows.

Release notes: [docs/RELEASE_v2.0.0.md](docs/RELEASE_v2.0.0.md)

### Added

- **Design system** — Expanded tokens (spacing, radius, shadows, semantic colors) and Inter font loading
- **Branding** — In-app logo mark, refreshed desktop shell, and updated app icons
- **Responsive layout** — Slide-over drawer on narrow viewports; full sidebar on desktop
- **Markdown rendering** — Assistant messages render GFM markdown with syntax-highlighted code blocks
- **Stop generation** — Cancel in-flight streaming from the composer
- **Tool calling** — Agent loop with image, audio, and attachment analysis tools
- **Multimodal attachments** — Images, audio, text files, and PDFs
- **Regenerate** — Re-run the last assistant response
- **Copy** — Copy full messages or individual code blocks
- **Rename & search** — Rename conversations; debounced sidebar search
- **Optional image/audio models** — Separate model settings for vision and transcription
- **Project cleanup script** — `npm run clean` removes build artifacts and temp files

### Changed

- Composer uses a multi-line textarea (Enter to send, Shift+Enter for newline)
- Floating composer card with elevated surface styling
- Preset default label reflects in-app settings instead of `.env`
- Theme toggle moved to a compact header control; full theme choice remains in Settings
- Rust app entry moved to `lib.rs` (`run()`) for Tauri 2 compatibility

### Fixed

- Duplicate streaming cursor while content was already rendering
- Delete conversation now asks for confirmation
- Settings modal closes on Escape
- Removed unused `imageAttachmentLimits` module
- Dark mode composer input colors

### Removed

- **Android mobile build** — Tauri Android target removed; Windows desktop only

## [1.1.0] - 2026-06-10

See [GitHub Releases](https://github.com/Satan2049/that-gpt/releases).

## [1.0.0] - 2026-06-03

First stable release.

[2.5.0]: https://github.com/Satan2049/that-gpt/releases/tag/v2.5.0
[2.2.0]: https://github.com/Satan2049/that-gpt/releases/tag/v2.2.0
[2.0.0]: https://github.com/Satan2049/that-gpt/releases/tag/v2.0.0
[1.1.0]: https://github.com/Satan2049/that-gpt/releases/tag/v1.1.0
[1.0.0]: https://github.com/Satan2049/that-gpt/releases/tag/v1.0.0
