# ThatGPT — Master TODO

Actionable checklist derived from [ACTION_PLAN.md](./ACTION_PLAN.md).  
Check boxes as work completes. Phases are ordered — finish Phase 0 before heavy Phase 1 work.

**Reference:** `docs/reference/`  
**Current app:** **ThatGPT** (rebranded from ChatNest v2)

---

## Phase 0 — Rebrand & ChatGPT Shell

### Brand & identity

- [x] Design logo: chat bubble + negative-space **T** (SVG)
- [x] Replace `client/src/shared/components/BrandMark.tsx`
- [x] Update `assets/logo.svg`, `client/public/logo.svg`
- [x] Update `assets/logo-square.png`, `assets/banner.png`, `assets/banner.svg`
- [x] Regenerate Tauri icons (`src-tauri/icons/`) via `npm run generate:brand`
- [x] Rename UI strings in app shell, settings, index.html
- [x] Update `src-tauri/tauri.conf.json` — product name, identifier `com.thatgpt.desktop`, window title
- [x] Update `package.json` name / description
- [x] Data dir migration: `com.chatnest.desktop` → `com.thatgpt.desktop` (first-run copy)
- [x] Update README, CHANGELOG, landing page (`docs/index.html`)

### Design tokens (ChatGPT-like)

- [x] Rewrite `client/src/shared/styles/tokens.css` — near-black dark theme, subtle borders
- [x] Add CSS vars: `--sidebar-width`, `--composer-max-width`, `--message-max-width`
- [x] Pill composer styles in `global.css`
- [x] Message area centered column (~48rem)
- [x] Thin scrollbar styling
- [x] Light theme pass (ChatGPT light is warm gray, not blue)

### Sidebar restructure

- [x] Create `client/src/shell/SidebarNav.tsx` — icon + label nav rows
- [x] Nav items: New chat, Search chats, Library, Projects, More
- [x] New chat button → `createConversation` + focus composer
- [x] **Recents** section header above conversation list
- [x] Restyle `ConversationList.tsx` — ChatGPT row hover, active state
- [x] Sidebar collapse toggle + expand button in header + localStorage persist
- [x] Bottom bar: connection status dot + "Settings" (replace profile/upgrade from reference)
- [x] Remove `PromptPresetPanel` from sidebar (relocate to Settings → Personalization)

### Main panel restructure

- [x] Header: **ThatGPT ▾** model dropdown (left) — stub until Phase 3
- [x] Header actions: overflow `···` menu with export
- [x] Move conversation title out of header (show in sidebar active row only)
- [x] Centered pill `Composer` — `+` attachment menu, placeholder "Ask anything"
- [x] Footer disclaimer (parody copy)
- [x] Remove emoji theme toggle from header → move to Settings → General

### Settings modal

- [x] Convert `SettingsPanel.tsx` to two-column modal (nav + content)
- [x] Tabs: General, Personalization, **Providers & Models**, Data controls, Storage, Keyboard
- [x] Migrate existing API key / URL / model / timeout fields → Providers tab
- [x] General: appearance (light/dark)
- [x] Personalization: default system prompt + parody personality presets + prompt presets panel
- [x] Keyboard: shortcuts reference table

### Phase 0 exit criteria

- [x] App builds as ThatGPT with ChatGPT-like layout in dark mode (default)
- [x] Manual QA: send, stream, stop, regenerate, settings save
- [x] Screenshots comparable to `docs/reference/Home.png` (layout parity)

---

## Phase 1 — Core Chat Parity ✅

### Streaming (critical)

- [x] Switch `send_message` in `src-tauri/src/services/chat.rs` to `create_chat_completion_stream`
- [x] Remove `emit_content_chunks` simulation (or keep as fallback)
- [x] Handle SSE parse errors gracefully
- [x] Verify cancel token aborts stream mid-flight
- [x] Frontend: handle partial chunks without flicker

### Scroll behavior

- [x] Track `isNearBottom` in `MessageList.tsx` (threshold ~100px)
- [x] Only auto-scroll when near bottom or user sent message
- [x] Show "↓ New messages" chip when scrolled up during stream

### Message actions

- [x] Hover-reveal action bar on messages (copy, regenerate, edit)
- [x] Edit user message — inline textarea → save → truncate after → resend
- [x] Retry button on failed assistant messages (error status)
- [x] Backend: `edit_message` / `retry_message` commands

### Rich rendering

- [x] Add `remark-math` + `rehype-katex` + KaTeX CSS to `MessageMarkdown.tsx`
- [x] Add Mermaid rendering (lazy load mermaid on code fence `mermaid`)
- [x] Test: tables, task lists, math, diagrams in dark/light

### Composer input

- [x] Drag-and-drop files onto composer area
- [x] Paste image from clipboard (`onPaste` → attachment)
- [x] `+` menu: upload file, upload image, (future: screen capture)
- [x] Draft persistence — `localStorage` key `thatgpt:draft:{conversationId}`
- [x] Auto-focus composer on new chat and after conversation switch

### UX polish

- [x] Toast component (`client/src/shared/components/Toast.tsx`) — copy, save, errors
- [x] Message fade-in animation (respect `prefers-reduced-motion`)
- [x] Empty chat state centered like ChatGPT (logo + suggestion chips)

### Phase 1 exit criteria

- [x] Smart scroll, LaTeX, mermaid, drag-drop image work
- [x] Edit message + retry on failed responses
- [x] No regressions on attachments / tools / regenerate / stop

---

## Phase 2 — Conversation Management

### Data model (backend)

- [x] Extend `Conversation` in `src-tauri/src/models/chat.rs`: `pinned`, `archived`, `folder_id`, `tags`, `ephemeral`
- [x] Migration for existing JSON conversations (default false/empty)
- [x] Commands: `pin_conversation`, `archive_conversation`, `move_to_folder`, `tag_conversation`

### Sidebar UX

- [x] Pinned section above Recents
- [x] Archive view (nav or More menu)
- [x] Double-click to rename conversation
- [x] Right-click context menu: pin, archive, rename, delete, export

### Search modal (Ctrl+K)

- [x] Create `client/src/shell/SearchModal.tsx`
- [x] Global shortcut Ctrl+K / Cmd+K
- [x] Group results: Today, Yesterday, Previous 7 days, Older
- [x] Arrow keys + Enter to open conversation
- [x] "New chat" action inside modal

### Folders / Projects

- [x] Create `client/src/features/folders/` — folder CRUD UI
- [x] `Projects` nav opens folder list view (reference: `Projects.png`)
- [x] Assign conversation to folder (dropdown or drag)

### Ephemeral chat

- [x] `Temporary chat` mode — `ephemeral: true` skips JSON persistence
- [x] Header toggle + empty state (reference: `Home-TemporayChat.png`)
- [x] Clear on close or manual "burn it" action (parody copy)

### Sidebar persistence

- [x] Remember collapsed/expanded in localStorage
- [x] Draggable sidebar resize handle (220–360px)

### Phase 2 exit criteria

- [x] Ctrl+K opens search modal with grouped results
- [x] Pin, archive, folders, ephemeral chat functional
- [x] Sidebar resize persists

---

## Phase 3 — Model & Input Experience ✅

### Providers

- [x] Settings → Providers tab: multiple provider profiles
- [x] Ollama provider — base URL `http://127.0.0.1:11434`, list models via `/api/tags`
- [x] Per-provider test connection button
- [x] Active provider selector

### Header model selector

- [x] `ModelSelector.tsx` in header — list models from active provider
- [x] Remember `last_model` per conversation
- [x] Capability badges (reasoning, vision, tools) on model rows — auto-detected from model id
- [x] Context window + max output token limits on model rows
- [x] Advanced flyout: temperature, max tokens, system prompt override

### Token visibility

- [x] Parse `usage` from API responses
- [x] Show token count in header or composer footer (prompt / completion / total)
- [x] Rough context window bar (estimate input tokens vs model limit)
- [x] Memory control: "truncate history to last N messages" setting

### Slash commands

- [x] Parse leading `/` in composer
- [x] Commands: `/new`, `/clear`, `/model`, `/export`, `/temp`, `/help`
- [x] Autocomplete dropdown for commands

### Prompt templates

- [x] `/prompt` or `@preset` to insert preset system prompt
- [x] Keep existing preset CRUD — surface in Settings → Personalization

### Keyboard

- [x] Document all shortcuts in Settings → Keyboard
- [x] Ctrl+Shift+O new chat, Ctrl+K search, Enter send, Shift+Enter newline
- [x] Optional: Ctrl+Shift+; for settings

### Phase 3 exit criteria

- [x] Switch models from header without opening full settings
- [x] Ollama works out of the box when running locally
- [x] Token usage visible after each response

---

## Phase 4 — Library & Knowledge ✅

### Library page

- [x] Create `client/src/features/library/` module
- [x] Nav → Library shows attachment table (reference: `Library.png`)
- [x] Filters: All / Images / Files
- [x] Columns: name, modified, size, source conversation
- [x] Backend: `index_attachments` command scanning data dir

### Document parsing

- [x] DOCX text extraction (Rust crate)
- [x] Improve PDF extraction beyond 4000 char preview cap (configurable)

### RAG (feature-flagged)

- [x] Settings toggle: Enable local knowledge base
- [x] Project/workspace file folder picker (path field + re-index; native dialog deferred)
- [x] Chunking pipeline in Rust
- [x] Embeddings via Ollama `nomic-embed-text` or API (JSON index stores vectors; keyword fallback)
- [x] Vector store MVP (embeddings in `data/knowledge/index.json` per chunk)
- [x] Retrieve top-k chunks on send
- [x] Citation markers in assistant markdown `[1]` linking to sources (clickable + footnotes)

### Phase 4 exit criteria

- [x] Library page lists all attachments
- [x] RAG behind feature flag works for at least PDF + txt
- [x] Knowledge citations emitted to UI with source links

---

## Phase 5 — Productivity & Power User ✅

- [x] Message bookmarking — star icon, filter view
- [x] Share conversation — generate standalone HTML export
- [x] Conversation templates — save thread as template (`> Save as template`)
- [x] Message branching data model (`parent_id`, `branch_id`, `branch_picks`)
- [x] Fork conversation from any message
- [x] Branch picker UI when regenerating (numbered pills + “New branch”)
- [x] Branch visualization (tree panel)
- [x] Side-by-side branch comparison view (right-click two branches)
- [x] Command palette — extend Ctrl+K with actions (type `>` for commands)
- [x] Raw prompt viewer (dev mode in settings + header menu)
- [x] Tool call inspector — expandable JSON per tool round
- [x] Local usage analytics screen (tokens over time in Settings → Storage)
- [x] LLM agent tools: `web_search` (DuckDuckGo) + `search_knowledge_base` when enabled
- [x] Model badges: Embedding, Vision, Image Gen, Audio, Reasoning, Tools

---

## Phase 6 — Polish & Future

- [x] Skeleton loaders — conversation list, message list
- [x] Full keyboard navigation (j/k between messages)
- [ ] Voice input — push-to-talk, Whisper fallback
- [x] Cost tracking — editable price per model in settings
- [ ] Windows Credential Manager for API keys (Tauri plugin)
- [x] Desktop notifications on generation complete (Web Notifications API)
- [x] Auto-update check (GitHub releases API; full Tauri updater deferred)

---

## Quick wins (can slot into any phase) ✅

- [x] Replace `window.confirm` delete with styled confirm modal
- [x] Export menu from header overflow instead of `<details>`
- [x] Copy entire conversation as markdown (one click)
- [x] `prefers-reduced-motion` for all animations
- [x] Focus trap in modals (settings, search, confirm)
- [x] Add `aria-live` region for streaming content

---

## Explicitly out of scope

- [ ] ~~Upgrade plan / billing~~
- [ ] ~~User profile / cloud account~~
- [ ] ~~ChatGPT Apps marketplace~~
- [ ] ~~Cloud sync~~
- [ ] ~~Training / model improvement opt-out~~ (replace with local data controls)

---

## File change heatmap (where most work lands)

| Area | Primary files |
|------|----------------|
| Shell layout | `DesktopShell.tsx`, new `SidebarNav.tsx`, `SearchModal.tsx`, `global.css` |
| Chat core | `chat.rs`, `ai.rs`, `chatStore.ts`, `MessageList.tsx`, `Composer.tsx` |
| Settings | `SettingsPanel.tsx` → split into modal tabs |
| Conversations | `chat.rs` models, `chat_repository.rs`, `ConversationList.tsx` |
| Rendering | `MessageMarkdown.tsx`, `MarkdownCodeBlock.tsx` |
| Brand | `BrandMark.tsx`, `tauri.conf.json`, icons, README |

---

*Last updated: 2026-06-20 — v2.5.0 GitHub release prep*
