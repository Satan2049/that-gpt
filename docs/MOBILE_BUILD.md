# Mobile build (Android & iOS) — Phase 1

ThatGPT mobile uses **Tauri 2** with a separate app identifier:

| Platform | Identifier | Config |
|----------|------------|--------|
| Desktop | `com.thatgpt.desktop` | `src-tauri/tauri.conf.json` |
| Android / iOS | `com.thatgpt.app` | `src-tauri/tauri.android.conf.json`, `tauri.ios.conf.json` |

Generated native projects live under `src-tauri/gen/` (gitignored). CI runs `init` on every build.

## Prerequisites

### Android (local)

- Node.js 20+
- Rust stable + Android targets (`rustup target add aarch64-linux-android …`)
- Android Studio / SDK + NDK 27+
- `JAVA_HOME` (JDK 17+)

### iOS (macOS only)

- Xcode 15+
- CocoaPods (`brew install cocoapods`)
- Rust targets: `aarch64-apple-ios-sim` (Apple Silicon sim)

The Tauri **iOS CLI** is only available on macOS (`npx tauri ios …`).

## Commands

```bash
npm ci

# Android — initialize Gradle project + patch manifest
npm run android:init

# Android — debug APK (auto debug-signed, sideload-friendly)
npm run android:build:apk:debug

# Android — release APK (unsigned; for manual signing)
npm run android:build:apk:unsigned

# Android — default alias
npm run android:build

# iOS — initialize Xcode project (macOS)
npm run ios:init

# iOS — simulator .app, no distribution signing
npm run ios:build:sim

# Collect built APK/IPA into release-mobile/
npm run mobile:collect
```

## Unsigned distribution policy (v2.6.2)

We **do not** configure Play Store or App Store signing in CI.

| Artifact | Signing | Install |
|----------|---------|---------|
| `ThatGPT-android-*-debug-*.apk` | Debug keystore (automatic) | **Install this** (sideload) |
| `ThatGPT-android-*-unsigned-*.apk` | None | Do not install — sign locally first |
| `*.app` (simulator) | None | Drag onto iOS Simulator |

`android:init` runs `sync-android-icons.mjs` so launcher icons from `src-tauri/icons/android/` are copied into the Gradle project.

Release assets are attached by [`.github/workflows/mobile-release.yml`](../.github/workflows/mobile-release.yml) when you push a `v*.*.*` tag.

## CI

| Workflow | Trigger | Output |
|----------|---------|--------|
| [`mobile-ci.yml`](../.github/workflows/mobile-ci.yml) | push/PR | Debug APK artifact |
| [`mobile-release.yml`](../.github/workflows/mobile-release.yml) | tag `v*` | Android debug APK + iOS sim zip on GitHub Release |
| [`ci.yml`](../.github/workflows/ci.yml) | push/PR | Rust tests + client build only |
| [`release.yml`](../.github/workflows/release.yml) | **manual** (`workflow_dispatch`) | Desktop Win/macOS/Linux (optional) |

Tag push runs **mobile-release only** — not desktop.

## Phase 2 — MobileShell UI

The mobile app uses a dedicated shell (not the desktop narrow layout):

| Component | Role |
|-----------|------|
| `MobileShell.tsx` | Bottom tabs: Chats · Projects · Library · More |
| `useShellLayout.ts` | Tauri Android/iOS UA, narrow viewport, coarse pointer |
| `mobile.css` | Safe areas, tab bar, touch-first message actions |

- **Chats**: conversation list → thread with back navigation; composer fixed at bottom
- **Projects**: folder list → project workspace with back navigation
- **Library**: full-screen library panel
- **More**: bookmarks, temporary chat, archived, presets, settings

Detection also applies in the browser when the viewport is narrow (useful for testing).

Phase 1 ships the **build pipeline**; Phase 2 ships the **mobile UX**; Phase 3 adds **polish**.

## Phase 3 — Polish

| Feature | Implementation |
|---------|------------------|
| Message actions | `BottomSheet` on mobile (`MessageActions`, `UserMessageActions`) |
| Android back | `useAndroidBackNavigation` + `mobileBackStack` in `MobileShell` |
| Safe areas + RTL | `mobile.css` — `env(safe-area-inset-*)`, `[dir="rtl"]` rules |
| Settings / Search | Full-screen via `body.layout-mobile`; Search header on mobile |
| Projects / Library | `ProjectWorkspace` compact mode; `LibraryPanel` card list |
| Android icons | `sync-android-icons.mjs` after `android init` |
| APK artifacts | Unique names per flavor (`*-debug-*` vs `*-unsigned-*`) — do not install unsigned |

See [RELEASE_v2.6.2.md](RELEASE_v2.6.2.md) and [FORK_BUILDS.md](FORK_BUILDS.md) for release and fork workflow.
