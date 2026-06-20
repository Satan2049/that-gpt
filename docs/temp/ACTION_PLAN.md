# ThatGPT Rebrand & ChatGPT Parity — Action Plan

> **Goal:** Transform ChatNest v2 into **ThatGPT** — a local-first desktop chat client that looks and behaves like ChatGPT (desktop), but runs on OpenAI-compatible APIs / Ollama, with a humorous parody tone. No cloud account, no upgrade plan, no profile — settings replace billing.

**Reference UI:** `docs/reference/` (ChatGPT desktop screenshots)  
**Current codebase:** ChatNest v2.0.0 — Tauri 2 + Rust + React 18 + Zustand + JSON storage  
**Target platform:** Windows desktop first (like Cursor / Void)

---

## 1. Vision & Positioning

| ChatGPT (cloud) | ThatGPT (local) |
|-----------------|-----------------|
| ChatGPT logo + model dropdown | ThatGPT logo + local model dropdown |
| Upgrade / Free plan | **Connection status** (API key set, Ollama reachable) |
| Profile / Account | **Settings shortcut** (API keys, models, providers) |
| Billing | **Providers** tab (OpenAI-compatible, Ollama, custom base URLs) |
| "ChatGPT can make mistakes" | Parody disclaimer, e.g. *"ThatGPT runs on your hardware. Blame your GPU, not us."* |
| Personalization (tone, nickname) | **Personality presets** with parody names ("Chaotic Good", "Passive-Aggressive Helper") |
| Library (cloud assets) | **Local Library** — attachments & exports on disk |
| Projects | **Folders / Projects** — group conversations locally |
| Temporary chat | **Ephemeral chat** — no persistence, no history |
| Deep Research / Images modes | **Capability modes** mapped to local tools (vision, PDF, audio) |

**Tagline (from reference chat):** *"Your AI. Your Models. Your Control."*

**Logo:** Chat bubble with negative-space **T** — minimal, professional, recognizable. Replace `BrandMark.tsx`, `assets/logo.svg`, Tauri icons.

**Tone:** UI copy stays clean and ChatGPT-familiar; parody lives in empty states, disclaimers, preset names, and optional personality modes — not in core navigation labels.

---

## 2. Current State Summary

### Already solid (keep & reskin)

| Area | Status | Key files |
|------|--------|-----------|
| Persistent conversations (JSON) | ✅ | `src-tauri/src/repository/chat_repository.rs` |
| Conversation search | ✅ | `ConversationList.tsx`, `search_conversations` |
| Rename / delete / auto-titles | ✅ | `ConversationList.tsx`, `chat.rs` |
| Stop generation | ✅ | `Composer.tsx`, `cancel_generation` |
| Regenerate last response | ✅ | `MessageActions.tsx`, `regenerate_last_response` |
| Copy message + code blocks | ✅ | `MessageActions.tsx`, `MarkdownCodeBlock.tsx` |
| GFM markdown + syntax highlight | ✅ | `MessageMarkdown.tsx`, `MarkdownCodeBlock.tsx` |
| Streaming UI (simulated chunks) | ⚠️ | `chat.rs` emits 48-char chunks; true SSE exists but unused |
| Optimistic send | ✅ | `chatStore.ts` |
| Auto-scroll | ✅ | `MessageList.tsx` |
| Typing cursor while streaming | ✅ | `global.css`, `MessageList.tsx` |
| Attachments (image, audio, PDF, text) | ✅ | `Composer.tsx`, `attachment_validation.rs` |
| Agent tools (vision, audio, read file) | ✅ | `tools.rs` |
| Prompt presets (model, temp, tokens) | ✅ | `PromptPresetPanel.tsx` |
| Settings panel (API key, URL, models) | ✅ | `SettingsPanel.tsx` |
| Light / dark theme | ✅ | `tokens.css`, `theme.ts` |
| Export MD / JSON | ✅ | `export.rs`, `DesktopShell.tsx` |
| Responsive desktop + mobile shell | ✅ | `DesktopShell.tsx`, `MobileShell.tsx` |
| Enter send / Shift+Enter newline | ✅ | `Composer.tsx` |

### Major gaps vs ChatGPT

1. **UI layout** — current shell is a utility sidebar (brand + conversations + presets inline), not ChatGPT's icon nav + Recents + modal settings.
2. **True streaming** — backend waits for full completion then fakes token stream.
3. **Message editing, branching, forking** — linear history only.
4. **Smart scroll lock** — always pins to bottom.
5. **Rich content** — no LaTeX, Mermaid.
6. **Input polish** — no drag-drop, paste images, voice, slash commands, drafts.
7. **Conversation org** — no pin, archive, folders, tags.
8. **Power user** — no Ctrl+K palette, keyboard nav, quick model switch in header.
9. **Knowledge** — no RAG, vector search, citations.
10. **UX polish** — no hover actions, context menus, skeletons, toasts, sidebar resize.

---

## 3. ChatGPT UI Anatomy (from `docs/reference/`)

Use these screenshots as the **layout spec**, not pixel-perfect cloning.

### Sidebar (`Home.png`, `Home-More.png`)

```
┌─────────────────────────┐
│ [≡]                     │  ← collapse toggle
│ ⊕ New chat              │  Ctrl+Shift+O
│ 🔍 Search chats         │  Ctrl+K → opens modal
│ 📚 Library              │
│ 📁 Projects             │
│ ⊞ Apps                  │  → skip or map to "Tools"
│ ◎ Codex                 │  → skip or "Dev console"
│ ··· More                │  → Temporary chat, Export, etc.
│                         │
│ Recents                 │
│   Chat title…           │
│   Chat title…           │
│   …                     │
│                         │
│ ─────────────────────── │
│ [●] Local / Connected   │  ← replaces Profile + Upgrade
│     Settings ›          │
└─────────────────────────┘
```

### Main area header

```
[ThatGPT ▾]                    [Share] [···]
     ↑ model + capability picker (not conversation title)
```

ChatGPT puts **model selector** top-left, not conversation title. Conversation title moves to sidebar highlight or a subtle breadcrumb.

### Composer (`Home.png`, `Home-TemporayChat.png`)

```
        ┌──────────────────────────────────────┐
   [+]  │  Ask anything                        │  [🎤] [↑]
        └──────────────────────────────────────┘
              ThatGPT runs locally. YMMV.
```

- Pill-shaped, centered, max-width ~768px
- `+` opens attachment menu (not a raw file input)
- Mic for voice (future)
- Send/stop morphs like ChatGPT (square stop while streaming)

### Search modal (`Home-SearchChats.png`)

- Overlay centered modal, not inline sidebar filter
- Grouped: Today / Yesterday / Previous 7 days / …
- New chat button inside modal
- Keyboard-first navigation

### Settings modal (`Settings.png`, `Setting-Personalization.png`)

Two-column modal (nav left, content right). Map ChatGPT categories to local equivalents:

| ChatGPT tab | ThatGPT tab |
|-------------|-------------|
| General | General (theme, launch, updates, text size) |
| Notifications | Skip or minimal (desktop notifications later) |
| Personalization | Personality + default system prompt |
| Apps | Connected tools / MCP (future) |
| Voice | Voice input settings (future) |
| **Billing** | **Providers & Models** ← API keys, Ollama, presets |
| Data controls | Export all, clear history, ephemeral default |
| Storage | Data folder path, attachment cache size |
| Safety | Content filters (optional, local) |
| Security | Skip cloud auth; optional keychain storage |
| Account | Skip |
| Keyboard | Shortcuts reference + customization |

### Library (`Library.png`)

- Table/grid of local attachments & exported files
- Filters: All / Images / Files
- Sort by modified date
- Backed by `%APPDATA%/com.thatgpt.desktop/data/attachments/` (new)

### Temporary chat (`Home-TemporayChat.png`)

- Toggle in header or More menu
- No write to JSON history
- Clear visual empty state explaining ephemeral mode

---

## 4. Implementation Phases

### Phase 0 — Rebrand & shell skeleton (1–2 weeks)

**Outcome:** App says ThatGPT, looks like ChatGPT at a glance.

- [ ] Rename product: ChatNest → ThatGPT (UI strings, `tauri.conf.json`, bundle id, README, icons)
- [ ] New logo (chat bubble + T) — SVG + app icons
- [ ] New design tokens matching ChatGPT dark/light (near-black `#0d0d0d`, subtle borders, pill composer)
- [ ] Restructure `DesktopShell` to ChatGPT layout:
  - Icon sidebar nav (New chat, Search, Library, Projects, More)
  - Recents list (reuse `ConversationList`, restyle)
  - Bottom bar: connection status + Settings (replaces profile/upgrade)
- [ ] Header: model dropdown left, actions right (share/export/···)
- [ ] Centered pill composer with `+` menu
- [ ] Settings as full modal with left nav (migrate existing `SettingsPanel`)
- [ ] Remove inline preset panel from sidebar → move to Settings or header preset picker

**Files to touch:** `DesktopShell.tsx`, `MobileShell.tsx`, `global.css`, `tokens.css`, `BrandMark.tsx`, `tauri.conf.json`, `SettingsPanel.tsx`

### Phase 1 — Core chat parity (2–3 weeks)

**Outcome:** Chat feels like ChatGPT for daily use.

- [ ] **True SSE streaming** — wire `create_chat_completion_stream` in `chat.rs`; remove chunk simulation
- [ ] **Smart scroll lock** — stick to bottom only when user is near bottom; "scroll to latest" chip when not
- [ ] **Hover message actions** — copy, regenerate, edit (edit UI stub → full in Phase 2)
- [ ] **Edit user messages** — inline edit → truncate history → resend
- [ ] **Retry failed messages** — per-message retry button on error state
- [ ] **LaTeX** — `remark-math` + `rehype-katex`
- [ ] **Mermaid** — custom remark plugin or `mermaid` in `MessageMarkdown`
- [ ] **Drag-drop + paste images** — `Composer.tsx` drop zone + `onPaste`
- [ ] **Draft persistence** — localStorage per conversation id
- [ ] **Auto-focus composer** on new chat / navigation
- [ ] **Message fade-in** — CSS animation on new messages
- [ ] **Toasts** — lightweight toast system for copy/save/errors

**Files:** `chat.rs`, `ai.rs`, `MessageList.tsx`, `Composer.tsx`, `MessageMarkdown.tsx`, `chatStore.ts`

### Phase 2 — Conversation management (2 weeks)

**Outcome:** Sidebar organization matches ChatGPT power users expect.

- [ ] Extend conversation model: `pinned`, `archived`, `folderId`, `tags[]`
- [ ] Pin / unpin (sidebar section: Pinned)
- [ ] Archive (hide from Recents, show in Archived)
- [ ] **Folders / Projects** — CRUD folders, drag chat into folder
- [ ] Tags / labels (optional chips on conversation rows)
- [ ] **Double-click rename** on sidebar items
- [ ] **Ctrl+K search modal** — global palette with grouped recents + fuzzy search
- [ ] **Temporary / ephemeral chat** mode
- [ ] Sidebar collapse + **remember sidebar state** in localStorage
- [ ] **Sidebar resize** — drag handle, persist width

**Files:** `chat.rs` models, `chat_repository.rs`, new `SearchModal.tsx`, `ConversationList.tsx`

### Phase 3 — Model & input experience (2 weeks)

**Outcome:** Model control visible like ChatGPT header dropdown.

- [ ] **Header model selector** — quick switch; remember last model per conversation
- [ ] **Ollama provider** — detect `localhost:11434`, list local models
- [ ] Multi-provider support in settings (OpenAI-compatible + Ollama + custom)
- [ ] **Temperature / max tokens** in model dropdown "Advanced" or conversation settings flyout
- [ ] **Context window indicator** — estimate tokens sent (tiktoken or rough char count)
- [ ] **Token usage display** — show prompt/completion tokens when API returns usage
- [ ] **Capability badges** — vision, tools, audio icons on model rows
- [ ] **Slash commands** — `/new`, `/clear`, `/model`, `/export`, `/temp`
- [ ] **Prompt templates** — slash or `@` picker (extend existing presets)
- [ ] **Keyboard shortcuts panel** — Settings → Keyboard tab

### Phase 4 — Library, attachments & knowledge (3–4 weeks)

**Outcome:** Local Library view + optional RAG.

- [ ] **Library page** — list all attachments across conversations
- [ ] Attachment index in Rust (scan + metadata JSON)
- [ ] **Workspace / project knowledge** — folder of files indexed per project
- [ ] **RAG pipeline** (optional, feature-flagged):
  - Chunk PDFs/text
  - Local embeddings via Ollama or API
  - Vector store (sqlite-vec or lanceDB in Rust)
  - Inject retrieved chunks into system context
- [ ] **Citation references** — footnote links to source chunks in assistant replies
- [ ] Document parsing: DOCX (docx crate), better PDF layout

### Phase 5 — Productivity & power user (2–3 weeks)

- [ ] Message bookmarking (star messages, filter view)
- [ ] Share conversation — export to shareable HTML/MD bundle
- [ ] Conversation templates (start from template thread)
- [ ] **Message branching / forking** — tree data model (`parentMessageId`, `branchId`)
- [ ] Branch visualization (simple tree sidebar or modal)
- [ ] Side-by-side comparison (two branches, two columns)
- [ ] Multi-agent (future — multiple system prompts in one thread)
- [ ] **Command palette** — extend Ctrl+K: actions, settings, model switch
- [ ] **Raw prompt viewer** — dev mode shows messages sent to API
- [ ] **Tool call inspector** — expandable JSON for tool rounds
- [ ] Usage analytics (local only) — token counts over time chart
- [ ] Session restore — scroll position + draft + last model

### Phase 6 — Polish, accessibility & mobile (ongoing)

- [ ] Skeleton loading for conversation list + messages
- [ ] Context menus (right-click chat, message)
- [ ] Focus-visible system, ARIA for modals
- [ ] Reduced motion preference
- [ ] Voice input (Web Speech API or Whisper push-to-talk)
- [ ] Cost tracking (manual price table per model in settings)
- [ ] Secure credential storage (Windows Credential Manager via Tauri plugin)

---

## 5. Feature Gap Matrix

Legend: ✅ Done · ⚠️ Partial · 🔨 Phase N · ⏭️ Skip/defer · ❌ Not started

### Core Chat Experience

| Feature | Now | Target | Phase |
|---------|-----|--------|-------|
| Streaming responses | ⚠️ simulated | ✅ true SSE | 1 |
| Message regeneration | ✅ | reskin | 0 |
| Stop generation | ✅ | reskin | 0 |
| Edit user messages | ❌ | ✅ | 1 |
| Retry failed messages | ⚠️ HTTP retry | per-message UI | 1 |
| Message branching | ❌ | ✅ | 5 |
| Conversation forking | ❌ | ✅ | 5 |
| Auto scroll | ✅ | keep | — |
| Smart scroll lock | ❌ | ✅ | 1 |
| Copy message / code | ✅ | hover UI | 1 |
| Inline code | ✅ | keep | — |
| Syntax highlighting | ✅ | keep | — |
| Markdown | ✅ | keep | — |
| LaTeX | ❌ | ✅ | 1 |
| Mermaid | ❌ | ✅ | 1 |

### Conversation Management

| Feature | Now | Phase |
|---------|-----|-------|
| History | ✅ | reskin 0 |
| Search | ⚠️ inline | modal Ctrl+K — 2 |
| Pin | ❌ | 2 |
| Archive | ❌ | 2 |
| Delete | ✅ | 0 |
| Rename | ⚠️ button | double-click — 2 |
| Auto titles | ✅ | 0 |
| Folders | ❌ | 2 |
| Tags | ❌ | 2 |
| Recent section | ⚠️ implicit | labeled — 0 |

### Input Experience

| Feature | Now | Phase |
|---------|-----|-------|
| Auto-resize textarea | ✅ | pill composer — 0 |
| Drag & drop | ❌ | 1 |
| Paste images | ❌ | 1 |
| Multi-file upload | ✅ | + menu — 0 |
| Keyboard shortcuts | ⚠️ | full map — 3 |
| Slash commands | ❌ | 3 |
| Mentions (@agent) | ❌ | 3 |
| Prompt templates | ✅ presets | slash — 3 |
| Draft persistence | ❌ | 1 |
| Voice input | ❌ | 6 |

### Model Experience

| Feature | Now | Phase |
|---------|-----|-------|
| Model selector | ⚠️ settings | header — 3 |
| Temperature | ⚠️ preset | flyout — 3 |
| Context window indicator | ❌ | 3 |
| Token usage | ❌ | 3 |
| Cost tracking | ❌ | 6 |
| System prompt editor | ✅ | Personalization tab — 0 |
| Memory controls | ❌ | truncate UI — 3 |
| Tool visibility | ⚠️ | inspector — 5 |
| Capability badges | ❌ | 3 |

### Attachments & Knowledge

| Feature | Now | Phase |
|---------|-----|-------|
| PDF / image upload | ✅ | 0 |
| Document parsing | ⚠️ | DOCX — 4 |
| RAG / vector search | ❌ | 4 |
| Knowledge base | ❌ | 4 |
| Citations | ❌ | 4 |

### UI / UX Polish

| Feature | Now | Phase |
|---------|-----|-------|
| ChatGPT-like layout | ❌ | 0 |
| Animations | ⚠️ | 1 |
| Skeleton loading | ❌ | 6 |
| Hover actions | ❌ | 1 |
| Context menus | ❌ | 6 |
| Toasts | ❌ | 1 |
| Sidebar resize | ❌ | 2 |

### Intentionally skipped (ChatGPT cloud-only)

- Upgrade plan, billing, profile photo, account login
- Cloud sync, training opt-out (replace with local data controls)
- Apps marketplace, Codex cloud (optional dev mode later)

---

## 6. Technical Architecture Changes

### 6.1 Rebrand / identifiers

| Item | Current | Target |
|------|---------|--------|
| Product name | ChatNest | ThatGPT |
| Tauri identifier | `com.chatnest.desktop` | `com.thatgpt.desktop` |
| Data dir | `%APPDATA%/com.chatnest.desktop/` | `%APPDATA%/com.thatgpt.desktop/` |
| Migration | — | One-time copy on first launch |

### 6.2 Data model extensions

```rust
// Conversation (extend chat.rs)
struct Conversation {
  // existing: id, title, messages, updated_at, prompt_preset_id
  pinned: bool,
  archived: bool,
  folder_id: Option<String>,
  tags: Vec<String>,
  ephemeral: bool,
  last_model: Option<String>,
}

// Message (for branching, Phase 5)
struct Message {
  // existing fields
  parent_id: Option<String>,
  branch_id: String,
  edited_at: Option<String>,
  status: MessageStatus, // sent | streaming | error | cancelled
}
```

### 6.3 New frontend modules

```
client/src/
  shell/
    SidebarNav.tsx          # icon nav
    SearchModal.tsx           # Ctrl+K
    SettingsModal/            # tabbed settings
  features/
    library/                  # attachment index UI
    folders/                  # projects
    commands/                 # slash + palette
    personality/              # parody presets
```

### 6.4 Streaming fix (Priority)

Current flow in `chat.rs`:
1. `create_chat_completion` (blocking) → full text
2. `emit_content_chunks` → fake stream

Target flow:
1. `create_chat_completion_stream` → SSE lines
2. Emit `chat-chunk` events per delta
3. Frontend appends to streaming message
4. Cancel token checked between chunks

### 6.5 Provider abstraction

```rust
enum ProviderKind {
  OpenAiCompatible { base_url, api_key },
  Ollama { host },
}
```

Settings UI: provider cards with test connection (already exists — split into Providers tab).

---

## 7. Design System Notes

### Colors (ChatGPT-inspired dark)

```css
--bg-app: #0d0d0d;
--bg-sidebar: #171717;
--bg-elevated: #212121;
--bg-composer: #2f2f2f;
--text-primary: #ececec;
--text-muted: #9b9b9b;
--accent: #10a37f; /* ChatGPT green — or ThatGPT indigo #6366f1 for parody distinction */
```

ThatGPT can keep **indigo/purple gradient** (from your branding notes) for accent while matching ChatGPT layout/spacing.

### Typography

- ChatGPT uses system UI / similar to Inter — keep Inter or switch to `ui-sans-serif` stack
- Message max-width ~48rem centered
- Composer max-width ~768px

### Spacing & radius

- Sidebar width: 260px default, resizable 220–360px
- Composer border-radius: 24px (pill)
- Modal radius: 12px

---

## 8. Parody Layer (without breaking UX)

Keep navigation labels familiar; inject personality in:

| Location | Example copy |
|----------|--------------|
| Empty chat | "Go on, bother a local model." |
| Ephemeral mode | "This chat vanishes like your motivation." |
| Settings → Personality | Presets: "Corporate Drone", "Unhinged Intern", "Actually Helpful" |
| Connection error | "Your API key ghosted us." |
| Ollama offline | "Ollama isn't running. Did you forget to feed it?" |
| Footer disclaimer | "ThatGPT hallucinates locally. Verify before deploying to prod." |
| Loading | "Consulting the weights…" |

---

## 9. Success Criteria

**MVP (Phase 0 + 1):** A user familiar with ChatGPT opens ThatGPT and within 10 seconds recognizes the layout; streaming, stop, regenerate, markdown, code copy, and settings work; app is fully local.

**V1 (Phase 0–3):** Ctrl+K search, pin/archive, model header dropdown, Ollama support, drag-drop images, LaTeX, ephemeral chat.

**V2 (Phase 4–5):** Library, folders/projects, RAG optional, branching, command palette, dev inspector.

---

## 10. Reference Index

| Screenshot | Use for |
|------------|---------|
| `Home.png` | Main layout, sidebar, composer, header |
| `Home-NewChat.png` | New chat flow |
| `Home-SearchChats.png` | Ctrl+K modal, date groups |
| `Home-More.png` | More menu items |
| `Home-More_Images.png` | Attachment / image mode |
| `Home-More-DeepResearch.png` | Capability modes (map to tools) |
| `Home-TemporayChat.png` | Ephemeral chat UX |
| `Home-ThreeDotsInTheUpperRightCorner.png` | Header overflow menu |
| `Library.png` | Library page layout |
| `Projects.png` | Folders / projects |
| `Settings.png` | Settings modal structure |
| `Setting-Personalization.png` | Personality tab |
| `Setting-Personalization2.png` | Custom instructions |

---

## 11. Risks & Decisions

| Decision | Recommendation |
|----------|----------------|
| Pixel-perfect clone vs inspired-by | **Inspired-by** — same layout/flows, distinct ThatGPT accent + copy |
| RAG complexity | Phase 4, feature-flagged; ship without it for V1 |
| Message branching | Requires data migration — design schema early in Phase 2 even if UI in Phase 5 |
| Bundle ID change | Breaking for existing users — provide migration + changelog |
| Ollama vs OpenAI-only | Both; Ollama is a first-class provider in settings |
| Mobile shell | Keep responsive shell; desktop is primary |

---

*Generated for the ChatNest → ThatGPT rebrand. See `docs/temp/TODO.md` for the actionable checklist.*
