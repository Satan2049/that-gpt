# Fork workflow — GitHub Actions builds for all platforms

Use this guide to build **ThatGPT v2.6.2** artifacts on GitHub Actions from your own fork — without setting up Android SDK, Xcode, or cross-compilers locally.

---

## 1. Fork the repository

1. Open the upstream repo on GitHub.
2. Click **Fork** → create a fork under your account.
3. Clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/that-gpt.git
cd that-gpt
```

---

## 2. Enable GitHub Actions

1. Go to your fork on GitHub → **Settings** → **Actions** → **General**.
2. Set **Actions permissions** to **Allow all actions and reusable workflows** (or allow selected actions including `tauri-apps/tauri-action`).
3. Save.

Forks do not run workflows until Actions is enabled and you push a tag or open a PR.

---

## 3. Sync the release tag

Make sure your fork has the `v2.6.2` tag (or whichever version you want to build):

```bash
git remote add upstream https://github.com/UPSTREAM_OWNER/that-gpt.git   # if needed
git fetch upstream --tags
git checkout main
git merge upstream/main
git tag v2.6.2    # skip if tag already exists locally
git push origin main
git push origin v2.6.2
```

Pushing tag `v2.6.2` triggers **mobile release only**:

| Workflow | Runs on | Produces |
|----------|---------|----------|
| `mobile-release.yml` | `ubuntu-22.04` (+ optional `macos-latest` for iOS sim) | Android debug APK, iOS sim zip |

Desktop (Win/macOS/Linux) is **not** built on tag push. Run **Release (Desktop)** manually from Actions when needed.

Monitor progress: **Actions** tab on your fork.

---

## 4. Download artifacts

When workflows finish:

1. Open **Releases** on your fork (GitHub creates a release for the tag).
2. Download binaries from **Assets**.

If the Release page is empty, check each workflow run → **Artifacts** (some steps upload directly to the Release via `softprops/action-gh-release`).

Expected files:

```
ThatGPT_2.6.2_x64-setup.exe          # Windows installer
ThatGPT_2.6.2_x64-portable.exe       # Windows portable
ThatGPT_2.6.2_aarch64.dmg            # macOS Apple Silicon
ThatGPT_2.6.2_amd64.AppImage         # Linux
SHA256.txt                           # Desktop checksums
*-debug.apk                          # Android sideload
*-unsigned.apk                       # Android (sign locally)
ThatGPT-ios-simulator-v2.6.2.zip     # iOS Simulator (macOS job)
```

---

## 5. CI without a tag (PR / push)

For validation only (no Release assets):

| Workflow | Trigger | Output |
|----------|---------|--------|
| `ci.yml` | push / PR to `main` | Rust tests + client build |
| `mobile-ci.yml` | push / PR to `main` | Debug APK artifact (download from run) |
| `mobile-release.yml` | tag `v*` | Android APK + iOS sim zip on Release |
| `release.yml` | **manual** | Desktop Win/macOS/Linux (optional) |

These do **not** attach files to a GitHub Release.

---

## 6. VirusTotal (optional)

After downloading release assets, upload each binary to [VirusTotal](https://www.virustotal.com/) and paste public links into [RELEASE_v2.6.2.md](RELEASE_v2.6.2.md):

| Artifact | Placeholder |
|----------|-------------|
| Windows installer | _[VT link — Windows installer]_ |
| Windows portable | _[VT link — Windows portable]_ |
| macOS DMG | _[VT link — macOS DMG]_ |
| Linux AppImage | _[VT link — Linux AppImage]_ |
| Android debug APK | _[VT link — Android debug APK]_ |
| Android unsigned APK | _[VT link — Android unsigned APK]_ |
| iOS sim zip | _[VT link — iOS sim zip]_ |

---

## 7. Troubleshooting

### Actions disabled on fork

**Settings → Actions → General** → allow workflows, then re-push the tag:

```bash
git push origin :refs/tags/v2.6.2   # delete remote tag (optional)
git push origin v2.6.2
```

### iOS job skipped or failed

- iOS CLI (`tauri ios`) only runs on **macOS** runners.
- The job is `continue-on-error: true` — Android/desktop assets still publish.
- Fork must have Actions enabled; Xcode/simulator build can take 15–30 min.

### Android NDK errors

Workflow pins NDK `27.0.12077973`. Re-run the job; local `npm run android:init` before build is handled in CI scripts.

### Release empty on first tag

Ensure `permissions: contents: write` is set (already in workflow files) and the default `GITHUB_TOKEN` can create releases.

---

## 8. One-page checklist

- [ ] Fork repo
- [ ] Enable Actions on fork
- [ ] Push `v2.6.2` tag
- [ ] Wait for `Release` + `Mobile Release` workflows
- [ ] Download assets from GitHub Release
- [ ] (Optional) Upload to VirusTotal and update release notes

No secrets required for unsigned mobile builds. Desktop signing uses Tauri’s default CI flow via `tauri-action`.
