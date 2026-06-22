# ThatGPT v2.5.0

**Release date:** 2026-06-20  
**Platform:** Windows x64 (desktop)

ThatGPT v2.5.0 is the first **GitHub-ready** release after the full ChatGPT-style rebrand and feature roadmap. It ships a complete local desktop chat experience for **OpenAI-compatible APIs** and **Ollama** — with agent tools, knowledge base RAG, image generation, and power-user workflows.

---

## Highlights

- **ChatGPT-like shell** — Sidebar nav, pill composer, model selector, icon message actions
- **Projects** — Custom instructions, file sources, project workspace
- **English & Persian** — UI language + automatic message text direction
- **Onboarding** — Short first-run tour (language, tips)
- **Multi-provider** — OpenAI-compatible profiles + Ollama out of the box
- **Agent tools** — Web search, knowledge base search, image analysis, audio analysis, **image generation** (`gpt-image-1` / DALL·E / Flux)
- **Local RAG** — Chunking, embeddings (Ollama or API), citations in assistant replies
- **Power user** — Branching, fork, templates, bookmarks, command palette, usage analytics
- **Polish** — Skeleton loaders, j/k navigation, cost estimates, desktop notifications, update check

---

## Download

| Artifact | Notes |
|----------|--------|
| `ThatGPT-2.5.0-windows-x64-portable.exe` | No installer; run directly |
| `ThatGPT_2.5.0_x64-setup.exe` | NSIS installer (per-user) |

Get both from **[GitHub Releases — v2.5.0](https://github.com/Satan2049/that-gpt/releases/tag/v2.5.0)**.

Verify with [`SHA256.txt`](../SHA256.txt) — see [docs/TRUST.md](./TRUST.md).

---

## What's new since v2.2.0

### Models & providers

- Header **model selector** with capability badges (Vision, Image Gen, Tools, Reasoning, Embedding, Audio)
- **Multiple provider profiles** — switch OpenAI-compatible APIs and local Ollama
- Per-conversation `last_model` memory; advanced flyout (temperature, max tokens, system override)
- **Token usage** footer with context bar and **estimated cost** (editable price table in Settings → Storage)
- **Slash commands** — `/new`, `/clear`, `/model`, `/export`, `/temp`, `/help`, `/prompt`

### Knowledge & library

- **Library** page — browse all attachments with filters (images / files)
- **Local knowledge base** (feature-flagged) — folder indexing, chunking, embeddings, top-k retrieval
- **Citation markers** `[1]` in markdown with clickable source links
- Improved **PDF** and **DOCX** text extraction

### Agent & multimodal

- **`web_search`** tool (DuckDuckGo) when enabled in settings
- **`search_knowledge_base`** tool when knowledge base is on
- **`generate_image`** tool — LLM requests image creation like ChatGPT; uses configured image-gen model
- **Vision** (analyze attached images) separate from **Image Gen** (create images)
- Tool call inspector — expandable JSON per tool round

### Conversation management

- **Ctrl+K** search modal with grouped results (Today, Yesterday, …)
- Pin, archive, rename, **ChatGPT-style context menu**, folders/projects
- **Settings → Advanced** — RAG, tools, usage in collapsible sections
- **Ephemeral (temporary) chat** — nothing written to disk
- Draggable sidebar resize (220–360px), collapse persisted

### Productivity

- Message **bookmarking** and filter view
- **Fork** conversation from any message; **inline branch** picker on regenerate
- **Conversation templates** — save and start from presets
- **Share as HTML** export; copy entire thread as Markdown
- Command palette actions (`>` prefix in Ctrl+K)
- Raw **API prompt viewer** (dev mode)
- Local **usage analytics** (tokens over time)

### UX & accessibility

- Empty chat state with logo and **suggestion chips**
- Smart scroll + “↓ New messages” chip during streaming
- Message edit, retry on failure, compact hover icon actions (copy, share, regenerate)
- **LaTeX** (KaTeX) and **Mermaid** diagrams in markdown
- Drag-and-drop / paste images; per-conversation draft persistence
- Skeleton loaders; **j/k** message navigation
- Styled confirm modals; header overflow menu
- `prefers-reduced-motion`; focus traps; `aria-live` streaming region
- Desktop **notifications** when generation completes
- **Check for updates** (GitHub releases API)
- **First-run onboarding** and **Persian/English** with auto RTL/LTR per message

### Rebrand & packaging

- Product identity **ThatGPT** (`com.thatgpt.desktop`)
- Rust crate renamed to **`that-gpt`** — process shows as `ThatGPT.exe` / `that-gpt.exe`
- Legacy data migration from `com.chatnest.desktop` on first launch
- Theme key migration (`chatnest-theme` → `thatgpt-theme`)

---

## Upgrade notes

1. **First launch** may copy data from `%APPDATA%\com.chatnest.desktop\` if present.
2. Settings live at `%APPDATA%\com.thatgpt.desktop\.env`.
3. Enable optional features in **Settings**:
   - Web search
   - Local knowledge base + embedding model
   - Dev mode (raw prompt viewer)
   - Model prices for cost estimates
4. For **image generation**, set an image-gen model (e.g. `gpt-image-1`) in **Providers** and use a tools-capable chat model.

---

## VirusTotal (add after build)

Upload portable and NSIS binaries, then paste report URLs here and in [TRUST.md](./TRUST.md):

| File | VirusTotal |
|------|------------|
| NSIS setup EXE | *TBD — add after release build* |
| Portable EXE | *TBD — add after release build* |

```markdown
## VirusTotal reports (v2.5.0)
- NSIS installer: <paste URL>
- Portable EXE: <paste URL>

Verify checksums: https://github.com/Satan2049/that-gpt/blob/main/SHA256.txt
```

---

## Screenshots

See [docs/screenshots/](./screenshots/) for README and landing page assets (`screenshot-chat.png`, `demo.gif`, etc.).

---

## Known limitations

- **Windows only** for pre-built binaries (Linux/macOS planned later)
- Voice input and Windows Credential Manager deferred
- Full Tauri auto-updater not included (manual check only)
- Knowledge base uses JSON vector index (not sqlite-vec / LanceDB)

---

## Full changelog

[CHANGELOG.md](../CHANGELOG.md#250---2026-06-20)
