import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseDir = path.join(root, "release-mobile");
const tauriConf = JSON.parse(
  fs.readFileSync(path.join(root, "src-tauri/tauri.conf.json"), "utf8")
);
const androidConf = fs.existsSync(path.join(root, "src-tauri/tauri.android.conf.json"))
  ? JSON.parse(fs.readFileSync(path.join(root, "src-tauri/tauri.android.conf.json"), "utf8"))
  : {};
const version = androidConf.version ?? tauriConf.version ?? "0.0.0";

function apkLabel(fileName) {
  const base = fileName.replace(/\.apk$/i, "");
  return base.replace(/^app-/i, "").replace(/^ThatGPT-/i, "");
}

function copyArtifacts(globRoot, pattern, destPrefix) {
  if (!fs.existsSync(globRoot)) return 0;
  let count = 0;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (pattern.test(entry.name)) {
        const label = apkLabel(entry.name);
        const dest = path.join(releaseDir, `${destPrefix}-${label}-v${version}.apk`);
        fs.copyFileSync(full, dest);
        console.log(`  ${path.relative(root, full)} -> ${path.relative(root, dest)}`);
        count += 1;
      }
    }
  };
  walk(globRoot);
  return count;
}

function copyApps(globRoot, pattern, destPrefix) {
  if (!fs.existsSync(globRoot)) return 0;
  let count = 0;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (pattern.test(entry.name)) {
          const dest = path.join(releaseDir, `${destPrefix}-v${version}.app`);
          copyTree(full, dest);
          console.log(`  ${path.relative(root, full)} -> ${path.relative(root, dest)}`);
          count += 1;
        } else walk(full);
      }
    }
  };
  walk(globRoot);
  return count;
}

function copyTree(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else fs.copyFileSync(from, to);
  }
}

fs.mkdirSync(releaseDir, { recursive: true });

console.log("Collecting mobile artifacts...");
let total = 0;

total += copyArtifacts(
  path.join(root, "src-tauri/gen/android/app/build/outputs/apk"),
  /\.apk$/i,
  "ThatGPT-android"
);

total += copyApps(
  path.join(root, "src-tauri/gen/apple/build"),
  /\.app$/i,
  "ThatGPT-ios-sim"
);

total += copyArtifacts(
  path.join(root, "src-tauri/gen/apple/build"),
  /\.ipa$/i,
  "ThatGPT-ios"
);

if (total === 0) {
  console.error("No mobile artifacts found.");
  process.exit(1);
}

console.log(`\nStaged ${total} file(s) in release-mobile/`);
