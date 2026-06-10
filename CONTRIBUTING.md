# Contributing to ChatNest

Thank you for your interest in contributing. ChatNest is a desktop chat client built with **Tauri 2**, **Rust**, and **React**.

## Ways to contribute

- Report bugs and request features via [GitHub Issues](https://github.com/Satan2049/chat-nest/issues)
- Submit pull requests for bug fixes, tests, or documentation
- Improve translations, UX copy, or accessibility
- Verify release binaries and share VirusTotal / SHA256 feedback ([docs/TRUST.md](docs/TRUST.md))

## Development setup

**Requirements**

- Node.js 20+
- Rust stable (see [rustup.rs](https://rustup.rs/))
- Windows: WebView2 runtime (usually preinstalled on Windows 11)

```bash
git clone https://github.com/Satan2049/chat-nest.git
cd chat-nest
npm install
```

Create config at `%APPDATA%\com.chatnest.desktop\.env` (see [src-tauri/.env.example](src-tauri/.env.example)).

```bash
npm run dev          # Desktop app with hot reload
npm run test:rust    # Rust unit tests
```

## Project layout

| Path | Purpose |
|------|---------|
| `client/` | React + Vite frontend |
| `src-tauri/` | Rust backend, Tauri commands, persistence |
| `assets/` | Logo, banner, screenshots for README |
| `scripts/` | Release packaging and SHA256 generation |
| `docs/` | Architecture, trust, and project docs |

## Pull request guidelines

1. **One concern per PR** — keep changes focused.
2. **Match existing style** — Rust formatting, TypeScript conventions, minimal diffs.
3. **Test your change** — run `npm run test:rust` and manual smoke test via `npm run dev`.
4. **Update docs** — if behavior, config paths, or release process changes.
5. **No secrets** — never commit `.env`, API keys, or personal chat data.

### Commit messages

Use clear, imperative subjects:

```text
fix: handle missing preset on conversation patch
docs: update TRUST.md with VirusTotal links
feat: add export conversation command
```

## Rust changes

- Business logic lives in `src-tauri/src/services/`
- Tauri commands in `src-tauri/src/commands/`
- Add unit tests for validation and error mapping when touching critical paths

## Frontend changes

- API calls go through `client/src/shared/lib/tauriInvoke.ts` (Tauri IPC only — no HTTP backend)
- State: Zustand stores under `client/src/features/*/store/`

## Release maintainers

```powershell
npm run build
npm run release:package
npm run release:hashes
```

Attach `release/*` and `SHA256.txt` to GitHub Releases. Tag stable releases as `v1.0.0`, `v1.0.1`, etc. See [CHANGELOG.md](CHANGELOG.md) and [docs/TRUST.md](docs/TRUST.md).

## Code of conduct

Be respectful and constructive. We aim for a welcoming environment for contributors of all experience levels.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
