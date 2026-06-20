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

## Phase 1 — Core Chat Parity

### Streaming (critical)

- [x] Switch `send_message` in `src-tauri/src/services/chat.rs` to `create_chat_completion_stream`
- [x] Remove `emit_content_chunks` simulation (or keep as fallback)
- [x] Handle SSE parse errors gracefully
- [ ] Verify cancel token aborts stream mid-flight
- [x] Frontend: handle partial chunks without flicker

### Scroll behavior

- [x] Track `isNearBottom` in `MessageList.tsx` (threshold ~100px)
- [x] Only auto-scroll when near bottom or user sent message
- [x] Show "↓ New messages" chip when scrolled up during stream

### Message actions

- [x] Hover-reveal action bar on messages (copy, regenerate, edit)
- [ ] Edit user message — inline textarea → save → truncate after → resend
- [ ] Retry button on failed assistant messages (error status)
- [ ] Backend: `edit_message` / `retry_message` commands

### Rich rendering

- [x] Add `remark-math` + `rehype-katex` + KaTeX CSS to `MessageMarkdown.tsx`
- [x] Add Mermaid rendering (lazy load mermaid on code fence `mermaid`)
- [ ] Test: tables, task lists, math, diagrams in dark/light

### Composer input

- [x] Drag-and-drop files onto composer area
- [x] Paste image from clipboard (`onPaste` → attachment)
- [x] `+` menu: upload file, upload image, (future: screen capture)
- [x] Draft persistence — `localStorage` key `thatgpt:draft:{conversationId}`
- [x] Auto-focus composer on new chat and after conversation switch

### UX polish

- [x] Toast component (`client/src/shared/components/Toast.tsx`) — copy, save, errors
- [x] Message fade-in animation (respect `prefers-reduced-motion`)
- [x] Empty chat state centered like ChatGPT (logo + suggestion chips optional)

### Phase 1 exit criteria

- [x] Smart scroll, LaTeX, mermaid, drag-drop image work
- [ ] Edit message + retry on failed responses
- [ ] No regressions on attachments / tools / regenerate / stop

---

## Phase 2 — Conversation Management

### Data model (backend)

- [ ] Extend `Conversation` in `src-tauri/src/models/chat.rs`: `pinned`, `archived`, `folder_id`, `tags`, `ephemeral`
- [ ] Migration for existing JSON conversations (default false/empty)
- [ ] Commands: `pin_conversation`, `archive_conversation`, `move_to_folder`, `tag_conversation`

### Sidebar UX

- [ ] Pinned section above Recents
- [ ] Archive view (nav or More menu)
- [ ] Double-click to rename conversation
- [ ] Right-click context menu: pin, archive, rename, delete, export

### Search modal (Ctrl+K)

- [ ] Create `client/src/shell/SearchModal.tsx`
- [ ] Global shortcut Ctrl+K / Cmd+K
- [ ] Group results: Today, Yesterday, Previous 7 days, Older
- [ ] Arrow keys + Enter to open conversation
- [ ] "New chat" action inside modal

### Folders / Projects

- [ ] Create `client/src/features/folders/` — folder CRUD UI
- [ ] `Projects` nav opens folder list view (reference: `Projects.png`)
- [ ] Assign conversation to folder (dropdown or drag)

### Ephemeral chat

- [ ] `Temporary chat` mode — `ephemeral: true` skips JSON persistence
- [ ] Header toggle + empty state (reference: `Home-TemporayChat.png`)
- [ ] Clear on close or manual "burn it" action (parody copy)

### Sidebar persistence

- [ ] Remember collapsed/expanded in localStorage
- [ ] Draggable sidebar resize handle (220–360px)

### Phase 2 exit criteria

- [ ] Ctrl+K opens search modal with grouped results
- [ ] Pin, archive, folders, ephemeral chat functional
- [ ] Sidebar resize persists

---

## Phase 3 — Model & Input Experience

### Providers

- [ ] Settings → Providers tab: multiple provider profiles
- [ ] Ollama provider — base URL `http://127.0.0.1:11434`, list models via `/api/tags`
- [ ] Per-provider test connection button
- [ ] Active provider selector

### Header model selector

- [ ] `ModelSelector.tsx` in header — list models from active provider
- [ ] Remember `last_model` per conversation
- [ ] Capability badges (vision, tools, audio) on model rows
- [ ] Advanced flyout: temperature, max tokens, system prompt override

### Token visibility

- [ ] Parse `usage` from API responses
- [ ] Show token count in header or composer footer (prompt / completion / total)
- [ ] Rough context window bar (estimate input tokens vs model limit)
- [ ] Memory control: "truncate history to last N messages" setting

### Slash commands

- [ ] Parse leading `/` in composer
- [ ] Commands: `/new`, `/clear`, `/model`, `/export`, `/temp`, `/help`
- [ ] Autocomplete dropdown for commands

### Prompt templates

- [ ] `/prompt` or `@preset` to insert preset system prompt
- [ ] Keep existing preset CRUD — surface in Settings → Personalization

### Keyboard

- [ ] Document all shortcuts in Settings → Keyboard
- [ ] Ctrl+Shift+O new chat, Ctrl+K search, Enter send, Shift+Enter newline
- [ ] Optional: Ctrl+Shift+; for settings

### Phase 3 exit criteria

- [ ] Switch models from header without opening full settings
- [ ] Ollama works out of the box when running locally
- [ ] Token usage visible after each response

---

## Phase 4 — Library & Knowledge

### Library page

- [ ] Create `client/src/features/library/` module
- [ ] Nav → Library shows attachment table (reference: `Library.png`)
- [ ] Filters: All / Images / Files
- [ ] Columns: name, modified, size, source conversation
- [ ] Backend: `index_attachments` command scanning data dir

### Document parsing

- [ ] DOCX text extraction (Rust crate)
- [ ] Improve PDF extraction beyond 4000 char preview cap (configurable)

### RAG (feature-flagged)

- [ ] Settings toggle: Enable local knowledge base
- [ ] Project/workspace file folder picker
- [ ] Chunking pipeline in Rust
- [ ] Embeddings via Ollama `nomic-embed-text` or API
- [ ] Vector store (sqlite-vec or lanceDB)
- [ ] Retrieve top-k chunks on send
- [ ] Citation markers in assistant markdown `[1]` linking to sources

### Phase 4 exit criteria

- [ ] Library page lists all attachments
- [ ] RAG behind feature flag works for at least PDF + txt

---

## Phase 5 — Productivity & Power User

- [ ] Message bookmarking — star icon, filter view
- [ ] Share conversation — generate standalone HTML export
- [ ] Conversation templates — save thread as template
- [ ] Message branching data model (`parent_id`, `branch_id`)
- [ ] Fork conversation from any message
- [ ] Branch picker UI when regenerating
- [ ] Branch visualization (tree panel)
- [ ] Side-by-side branch comparison view
- [ ] Command palette — extend Ctrl+K with actions (toggle theme, open settings, switch model)
- [ ] Raw prompt viewer (dev mode)
- [ ] Tool call inspector — expandable JSON per tool round
- [ ] Local usage analytics screen (tokens over time)

---

## Phase 6 — Polish & Future

- [ ] Skeleton loaders — conversation list, message list
- [ ] Full keyboard navigation (j/k between messages)
- [ ] Voice input — push-to-talk, Whisper fallback
- [ ] Cost tracking — editable price per model in settings
- [ ] Windows Credential Manager for API keys (Tauri plugin)
- [ ] Desktop notifications on generation complete
- [x] ~~Mobile shell refresh~~ — removed; Windows desktop only
- [ ] Auto-update check (Tauri updater)

---

## Quick wins (can slot into any phase)

- [ ] Replace `window.confirm` delete with styled confirm modal
- [ ] Export menu from header overflow instead of `<details>`
- [ ] Copy entire conversation as markdown (one click)
- [ ] `prefers-reduced-motion` for all animations
- [ ] Focus trap in modals (settings, search)
- [ ] Add `aria-live` region for streaming content

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

*Last updated: 2026-06-20 — rebrand planning session*
