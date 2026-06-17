# Trust and verification

ChatNest is open source. You can build it yourself, or download pre-built binaries from [GitHub Releases](https://github.com/Satan2049/chat-nest/releases). This document explains how to verify that a downloaded file matches the published checksums and how to scan binaries with VirusTotal.

## SHA256 checksums

Each release publishes a `SHA256.txt` file listing cryptographic hashes for:

- Portable `.exe` files
- NSIS setup `.exe` installers
- `.zip` release archives
- Optional branding assets (`assets/logo.png`, `assets/banner.png`)

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

1. Download the release file (for example `ChatNest-1.1.0-windows-x64-portable.exe`).
2. Download `SHA256.txt` from the same release.
3. Compute the hash of your file:

```powershell
Get-FileHash -Algorithm SHA256 .\ChatNest-1.1.0-windows-x64-portable.exe
```

4. Compare the `Hash` value with the matching line in `SHA256.txt` (case-insensitive).

Example `SHA256.txt` line:

```text
a1b2c3d4...  release/ChatNest-1.1.0-windows-x64-portable.exe
```

The hash before the spaces must match exactly.

### Verify on macOS / Linux

```bash
shasum -a 256 ChatNest-1.0.0-windows-x64-portable.exe
# or
sha256sum ChatNest-1.0.0-windows-x64-portable.exe
```

Compare the output with `SHA256.txt`.

## VirusTotal scanning

Independent antivirus engines may flag **new or uncommon** executables — especially unsigned Tauri/Rust apps — until they build reputation. That is not necessarily malware.

### Scan a release binary

1. Open [VirusTotal](https://www.virustotal.com/).
2. Choose **Upload** and select the `.exe` or `.zip` from the release.
3. Wait for the scan to finish and review the detection ratio and engine details.

### Maintainer workflow

After publishing a release, upload these files to VirusTotal:

| File | Purpose |
|------|---------|
| `ChatNest-*-portable.exe` | Standalone portable binary |
| `ChatNest_*_x64-setup.exe` | NSIS installer |

Add the VirusTotal report links to the GitHub Release notes so users can review them without re-uploading.

### Published reports (v2.0.0)

| File | SHA256 | VirusTotal | Notes |
|------|--------|------------|-------|
| NSIS setup EXE | `b5bacd8762a769ba8456ea96ee227d0d18875a202ab061b4fb10745990e4552f` | [View report](https://www.virustotal.com/gui/file/b5bacd8762a769ba8456ea96ee227d0d18875a202ab061b4fb10745990e4552f?nocache=1) | SecureAge — `Malicious` (heuristic) |
| Portable EXE | `752ab6ebc466319fad186549fdb9a1a23c155f38dd6ade6bf07846b1886c3d74` | [View report](https://www.virustotal.com/gui/file/752ab6ebc466319fad186549fdb9a1a23c155f38dd6ade6bf07846b1886c3d74?nocache=1) | Trapmine — `Malicious.moderate.ml.score` (heuristic) |

Copy this block into GitHub Release notes:

```markdown
## VirusTotal reports (v2.0.0)
- NSIS installer: https://www.virustotal.com/gui/file/b5bacd8762a769ba8456ea96ee227d0d18875a202ab061b4fb10745990e4552f?nocache=1
- Portable EXE: https://www.virustotal.com/gui/file/752ab6ebc466319fad186549fdb9a1a23c155f38dd6ade6bf07846b1886c3d74?nocache=1
```

**Note:** As of the published scan, **2 heuristic engines** (SecureAge, Trapmine) flagged these unsigned v2.0.0 builds. The majority of engines reported clean. See [Interpreting results](#interpreting-results) below.

### Published reports (v1.1.0)

| File | SHA256 | VirusTotal |
|------|--------|------------|
| Portable EXE | `a67da016dc47add860ed38c57de5461abcd4365aa59e597718208a0876876b8b` | [View report](https://www.virustotal.com/gui/file/a67da016dc47add860ed38c57de5461abcd4365aa59e597718208a0876876b8b) |
| NSIS setup EXE | `a92cb98a81771f10cd127bc4adb56e22a502394f46c1600b6b2eb44fd9e8e696` | [View report](https://www.virustotal.com/gui/file/a92cb98a81771f10cd127bc4adb56e22a502394f46c1600b6b2eb44fd9e8e696) |

Copy this block into GitHub Release notes:

```markdown
## VirusTotal reports (v1.1.0)
- Portable EXE: https://www.virustotal.com/gui/file/a67da016dc47add860ed38c57de5461abcd4365aa59e597718208a0876876b8b
- NSIS installer: https://www.virustotal.com/gui/file/a92cb98a81771f10cd127bc4adb56e22a502394f46c1600b6b2eb44fd9e8e696
```

**Note:** As of the published scan, **2 engines** (SecureAge, Trapmine) flagged these builds. The majority of engines reported clean. See [Interpreting results](#interpreting-results) below.

### Interpreting results

- **0 detections** — Common for established signed apps; new unsigned builds may still be clean.
- **1–3 detections on heuristic / reputation engines** — Often false positives on new, unsigned, or Rust/Tauri binaries. **SecureAge** and **Trapmine** frequently flag unknown executables until they build reputation. Compare with SHA256 verification and a local source build.
- **Many detections across major vendors** (Microsoft, Google, Kaspersky, etc.) — Do not run the file. [Open a security issue](../SECURITY.md) or discussion on the repository.

## Build from source (highest trust)

If you do not trust pre-built binaries, build locally:

```bash
git clone https://github.com/Satan2049/chat-nest.git
cd chat-nest
npm install
npm run build
```

Your binary will be at:

```text
src-tauri/target/release/bundle/portable/ChatNest.exe
```

Compare its SHA256 to your own build output, not to a downloaded file.

## Code signing (future)

Windows SmartScreen warnings are reduced when binaries are signed with a trusted code-signing certificate. Code signing is planned for future releases; until then, use SHA256 verification and VirusTotal reports above.

## Questions

For security concerns, see [SECURITY.md](../SECURITY.md). For general questions, open a [GitHub Discussion](https://github.com/Satan2049/chat-nest/discussions).
