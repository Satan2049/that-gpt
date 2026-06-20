# Trust and verification

ThatGPT is open source. You can build it yourself, or download pre-built **Windows** binaries from [GitHub Releases](https://github.com/Satan2049/that-gpt/releases). This document explains how to verify checksums and where to publish VirusTotal scan links.

## SHA256 checksums

Each release publishes a `SHA256.txt` file listing cryptographic hashes for:

- Portable `.exe` files
- NSIS setup `.exe` installers
- `.zip` release archives
- Optional branding assets (`assets/logo-square.png`, `assets/banner.png`)

### Generate checksums (maintainers)

After a production build:

```powershell
npm run build
npm run release:package
npm run release:hashes
```

Or in one step:

```powershell
.\scripts\generate-sha256.ps1 -Package
```

Commit or attach `SHA256.txt` to the GitHub Release alongside the binaries.

### Verify on Windows (PowerShell)

1. Download the release file (for example `ThatGPT-2.2.0-windows-x64-portable.exe`).
2. Download `SHA256.txt` from the same release.
3. Compute the hash:

```powershell
Get-FileHash -Algorithm SHA256 .\ThatGPT-2.2.0-windows-x64-portable.exe
```

4. Compare the `Hash` value with the matching line in `SHA256.txt` (case-insensitive).

## VirusTotal scanning

Independent antivirus engines may flag **new or uncommon** executables — especially unsigned Tauri/Rust apps — until they build reputation. That is not necessarily malware.

### Scan a release binary

1. Open [VirusTotal](https://www.virustotal.com/).
2. Upload the release `.exe` (portable and NSIS installer separately).
3. Copy each report URL from the browser address bar (`https://www.virustotal.com/gui/file/<sha256>?...`).

### Where to put VirusTotal links (maintainers)

After each release build, update **all three**:

| Location | What to add |
|----------|-------------|
| **`docs/TRUST.md`** | § **Published reports (vX.Y.Z)** table — canonical, long-lived |
| **GitHub Release body** | Markdown block with both VT URLs (see below) |
| **`docs/RELEASE_vX.Y.Z.md`** | Same table as TRUST.md for that version |

### Published reports (v2.2.0)

| File | VirusTotal |
|------|------------|
| NSIS setup EXE | [View report](https://www.virustotal.com/gui/file/f63d133370d374f7253872385f31f7f6bd117836b83e543dde89f15132b5f1a0?nocache=1) |
| Portable EXE | [View report](https://www.virustotal.com/gui/file/dc214aa871c8fb4b2922b2ae9bafb92ce740950b524700c2b672023644d1765f?nocache=1) |

```markdown
## VirusTotal reports (v2.2.0)
- NSIS installer: https://www.virustotal.com/gui/file/f63d133370d374f7253872385f31f7f6bd117836b83e543dde89f15132b5f1a0?nocache=1
- Portable EXE: https://www.virustotal.com/gui/file/dc214aa871c8fb4b2922b2ae9bafb92ce740950b524700c2b672023644d1765f?nocache=1

Verify checksums: https://github.com/Satan2049/that-gpt/blob/main/SHA256.txt
```

### Published reports (v2.0.0 — ChatNest)

Historical scans from the prior product name. Hashes refer to ChatNest v2.0.0 builds.

| File | SHA256 | VirusTotal |
|------|--------|------------|
| NSIS setup EXE | `b5bacd8762a769ba8456ea96ee227d0d18875a202ab061b4fb10745990e4552f` | [View report](https://www.virustotal.com/gui/file/b5bacd8762a769ba8456ea96ee227d0d18875a202ab061b4fb10745990e4552f?nocache=1) |
| Portable EXE | `752ab6ebc466319fad186549fdb9a1a23c155f38dd6ade6bf07846b1886c3d74` | [View report](https://www.virustotal.com/gui/file/752ab6ebc466319fad186549fdb9a1a23c155f38dd6ade6bf07846b1886c3d74?nocache=1) |

### Interpreting results

- **0 detections** — Common for established signed apps; new unsigned builds may still be clean.
- **1–3 detections on heuristic engines** — Often false positives on new, unsigned Rust/Tauri binaries.
- **Many detections across major vendors** — Do not run the file. See [SECURITY.md](../SECURITY.md).

## Build from source (highest trust)

```bash
git clone https://github.com/Satan2049/that-gpt.git
cd that-gpt
npm install
npm run build
```

Portable binary:

```text
src-tauri/target/release/bundle/portable/ThatGPT.exe
```

## Code signing (future)

Code signing is planned for future releases; until then, use SHA256 verification and VirusTotal reports above.

## Questions

See [SECURITY.md](../SECURITY.md) and [GitHub Discussions](https://github.com/Satan2049/that-gpt/discussions).
