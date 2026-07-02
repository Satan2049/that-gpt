import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseDir = path.join(root, "src-tauri", "target", "release");
const bundleDir = path.join(releaseDir, "bundle");
const portableDir = path.join(bundleDir, "portable");

const isWindows = process.platform === "win32";
const rawName = isWindows ? "that-gpt.exe" : "that-gpt";
const brandedName = isWindows ? "ThatGPT.exe" : "ThatGPT";

const src = path.join(releaseDir, rawName);
if (!fs.existsSync(src)) {
  console.error(`Release executable not found: ${src}`);
  console.error("Run `npm run build` first.");
  process.exit(1);
}

fs.mkdirSync(portableDir, { recursive: true });
fs.copyFileSync(src, path.join(portableDir, brandedName));
if (brandedName !== rawName) {
  fs.copyFileSync(src, path.join(portableDir, rawName));
}

console.log("Production artifacts:");
console.log(`  Portable: src-tauri/target/release/bundle/portable/${brandedName}`);

for (const subdir of ["nsis", "dmg", "appimage", "deb", "macos"]) {
  const dir = path.join(bundleDir, subdir);
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir)) {
    if (/\.(exe|dmg|AppImage|deb|zip)$/i.test(file)) {
      console.log(`  Bundle: src-tauri/target/release/bundle/${subdir}/${file}`);
    }
  }
}
