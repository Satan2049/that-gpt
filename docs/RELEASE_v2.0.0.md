# ChatNest v2.0.0 — Release notes

**Desktop refresh for Windows** — redesigned UI, agent tooling, and a sharper day-to-day chat experience. This release is **Windows desktop only** (portable + NSIS installer).

## Highlights

- **New look & feel** — Design tokens, Inter typography, refreshed shell, and dark-mode polish
- **Responsive layout** — Mobile-style drawer on narrow windows; full sidebar on desktop
- **Markdown in chat** — GFM rendering with syntax-highlighted code blocks; copy message or code
- **Agent features** — Tool calling loop, stop generation, regenerate last reply
- **Richer attachments** — Images, audio, text files, and PDFs with optional vision/transcription models
- **Conversation tools** — Rename threads, sidebar search, export Markdown/JSON

## Downloads

| Artifact | Description |
|----------|-------------|
| **Portable EXE** | Single-file app, no installer |
| **NSIS setup** | Windows x64 installer |

Get both from **[GitHub Releases — v2.0.0](https://github.com/Satan2049/chat-nest/releases/tag/v2.0.0)**.

Verify with [`SHA256.txt`](../SHA256.txt) — see [docs/TRUST.md](./TRUST.md).

## VirusTotal reports (v2.0.0)

Independent scans for the published Windows builds. **Two heuristic engines** flagged these unsigned binaries (common for new Tauri/Rust apps):

| Build | Engines | Report |
|-------|---------|--------|
| **NSIS setup EXE** | SecureAge — `Malicious` | [View on VirusTotal](https://www.virustotal.com/gui/file/b5bacd8762a769ba8456ea96ee227d0d18875a202ab061b4fb10745990e4552f?nocache=1) |
| **Portable EXE** | Trapmine — `Malicious.moderate.ml.score` | [View on VirusTotal](https://www.virustotal.com/gui/file/752ab6ebc466319fad186549fdb9a1a23c155f38dd6ade6bf07846b1886c3d74?nocache=1) |

SHA256:

```text
b5bacd8762a769ba8456ea96ee227d0d18875a202ab061b4fb10745990e4552f  NSIS setup EXE
752ab6ebc466319fad186549fdb9a1a23c155f38dd6ade6bf07846b1886c3d74  Portable EXE
```

Compare hashes locally with `Get-FileHash -Algorithm SHA256 <file>`. If unsure, [build from source](../README.md#build-from-source).

## Upgrade from v1.x

1. Download v2.0.0 portable or installer from Releases.
2. Your data stays in `%APPDATA%\com.chatnest.desktop\` — conversations and `.env` are unchanged.
3. Open **Settings** to confirm API key, base URL, and model.

## Full changelog

See [CHANGELOG.md](../CHANGELOG.md#200---2026-06-17).

---

### Suggested GitHub Release description (copy-paste)

```markdown
## ChatNest v2.0.0 — Desktop refresh

Major Windows release: new UI, markdown chat, agent tools, multimodal attachments, and responsive layout.

### Download
- Portable `.exe` or NSIS installer (Windows x64)
- Verify with `SHA256.txt` in this release

### VirusTotal (v2.0.0)
- NSIS installer: https://www.virustotal.com/gui/file/b5bacd8762a769ba8456ea96ee227d0d18875a202ab061b4fb10745990e4552f?nocache=1 (SecureAge heuristic)
- Portable EXE: https://www.virustotal.com/gui/file/752ab6ebc466319fad186549fdb9a1a23c155f38dd6ade6bf07846b1886c3d74?nocache=1 (Trapmine heuristic)

Unsigned Tauri/Rust builds often get 1–2 heuristic flags. Verify SHA256 or build from source if you prefer.

### What's new
- Redesigned shell, design tokens, Inter font, dark mode polish
- Markdown + code highlighting; copy messages and code blocks
- Stop generation, regenerate, rename & search conversations
- Tool calling agent loop; images, audio, text, PDF attachments
- Responsive drawer layout on narrow windows

**Full notes:** [CHANGELOG.md](https://github.com/Satan2049/chat-nest/blob/main/CHANGELOG.md#200---2026-06-17)
```
