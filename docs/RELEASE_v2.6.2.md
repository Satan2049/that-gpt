# Release v2.6.2

**Mobile + cross-platform desktop** — Android sideload, iOS simulator, Windows/macOS/Linux desktop.

Push tag `v2.6.2` to trigger:

| Workflow | Artifacts |
|----------|-----------|
| [`.github/workflows/release.yml`](../.github/workflows/release.yml) | Desktop: NSIS, portable EXE, DMG, AppImage |
| [`.github/workflows/mobile-release.yml`](../.github/workflows/mobile-release.yml) | Android debug + unsigned APK, iOS sim zip |

See also: [Fork builds from GitHub Actions](FORK_BUILDS.md) · [Mobile build guide](MOBILE_BUILD.md)

---

## Highlights

### Mobile (Phase 1–3)

- **Build pipeline** — Tauri Android (`com.thatgpt.app`) + iOS simulator, unsigned release policy
- **MobileShell** — Bottom tabs: Chats · Projects · Library · More
- **Polish (Phase 3)**
  - Bottom sheets for message actions (touch-first)
  - Android hardware back → close overlays, thread → list, project → folders, exit app
  - Safe areas + RTL (FA locale)
  - Settings & Search full-screen on mobile
  - Library card list + simplified project workspace

### Desktop (carried from v2.6.1)

- Voice input, OS keychain for API keys, semver update check
- GitHub Actions CI + multi-platform release
- UX fixes: purple user bubbles, message menus, notifications

---

## Download (همه از GitHub Actions — بیلد محلی لازم نیست)

با push تگ `v2.6.2`، **همهٔ artifactها روی GitHub Actions ساخته می‌شوند** و روی صفحه **Releases** قرار می‌گیرند.  
کار تو: دانلود → آپلود به VirusTotal → paste لینک‌ها در release description.

| Workflow | چه چیزی می‌سازد |
|----------|------------------|
| `release.yml` | Windows (NSIS + portable), macOS DMG, Linux AppImage, `SHA256.txt` |
| `mobile-release.yml` | Android debug APK, Android unsigned APK, iOS sim zip |

### Desktop

| Platform | File | VirusTotal |
|----------|------|------------|
| Windows x64 (installer) | `ThatGPT_*_x64-setup.exe` | _[VT link — Windows installer]_ |
| Windows x64 (portable) | `ThatGPT_*_x64-portable.exe` | _[VT link — Windows portable]_ |
| macOS Apple Silicon | `ThatGPT_*_aarch64.dmg` | _[VT link — macOS DMG]_ |
| Linux x64 | `ThatGPT_*_amd64.AppImage` | _[VT link — Linux AppImage]_ |

Checksums: `SHA256.txt` (خود CI می‌سازد — برای VT لازم نیست)

### Mobile

| Platform | File (from Release) | برای نصب | برای VirusTotal |
|----------|---------------------|----------|-----------------|
| Android | `ThatGPT-android-universal-debug-v2.6.2.apk` (or `*-debug-*`) | ✅ **فقط همین** | ✅ |
| Android | `ThatGPT-android-*-unsigned-*.apk` | ❌ بدون sign نصب نمی‌شود | اختیاری |
| iOS Simulator | `ThatGPT-ios-simulator-v2.6.2.zip` | Simulator فقط | ✅ |

> **خطای «package appears to be invalid»:** معمولاً یعنی فایل **unsigned** را نصب کردی، یا Release قدیمی بود که debug/unsigned روی هم overwrite شده بود. فقط APK با **`debug`** در نام را نصب کن.

---

## VirusTotal workflow

1. **Tag بزن** → Actions تمام بیلدها را می‌سازد (~۱۵–۴۵ دقیقه)
   ```bash
   git tag v2.6.2
   git push origin v2.6.2
   ```
2. برو **GitHub → Releases → v2.6.2 → Assets** و این فایل‌ها را دانلود کن:
   - `*-setup.exe`
   - `*-portable.exe` (یا نام مشابه portable)
   - `*.dmg`
   - `*.AppImage`
   - `ThatGPT-android-universal-debug-v2.6.2.apk` (**حتماً debug، نه unsigned**)
   - `ThatGPT-ios-simulator-v2.6.2.zip`
3. هر فایل را در [virustotal.com](https://www.virustotal.com/) آپلود کن → **Copy link**
4. لینک‌ها را در **GitHub Release description** و جدول بالا paste کن

**بیلد محلی لازم نیست** مگر بخواهی قبل از tag تست کنی.

---

## Install

### Windows / macOS / Linux

Download the artifact for your OS from the [GitHub Release](https://github.com/YOUR_ORG/that-gpt/releases/tag/v2.6.2) page.

### Android (sideload)

1. Enable **Install unknown apps** for your browser/files app.
2. Download **`ThatGPT-android-universal-debug-v2.6.2.apk`** (name must contain **`debug`**, not `unsigned`).
3. Install. Grant mic permission if using voice input.

If you see **«App not installed as package appears to be invalid»**, you likely picked the **unsigned** APK — use the **debug** file only.

### iOS (simulator only)

1. Unzip `ThatGPT-ios-simulator-v2.6.2.zip`.
2. Drag the `.app` onto an iOS Simulator (macOS + Xcode required).

No App Store / TestFlight signing in this release.

---

## Build locally (اختیاری — فقط برای تست قبل از tag)

```bash
npm ci

# Desktop (current OS)
npm run build
npm run test:rust

# Android debug APK
npm run android:init
npm run android:build:apk:debug

# iOS simulator (macOS only)
npm run ios:init
npm run ios:build:sim
```

---

## Tag release

```bash
git tag v2.6.2
git push origin v2.6.2
```

CI خودش همه artifactها را روی Release می‌گذارد. بعد از اتمام Actions، فایل‌ها را برای VirusTotal بردار (بخش بالا).

---

## Upgrade notes

- **Desktop:** API keys migrate from `.env` / `providers.json` into OS credential store on first launch (v2.6.1+).
- **Mobile:** Uses `com.thatgpt.app` (separate from desktop `com.thatgpt.desktop`). First install is a fresh mobile app — no desktop data sync yet.
- **Browser narrow viewport:** `MobileShell` activates below 900px width for testing without a device.

---

## Known limitations

- iOS build is simulator-only (no device/IPA signing in CI).
- Android release APK is unsigned in CI.
- Mobile and desktop are separate app IDs with separate data directories.
