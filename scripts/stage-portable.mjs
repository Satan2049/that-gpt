import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseDir = path.join(root, "src-tauri", "target", "release");
const bundleDir = path.join(releaseDir, "bundle");
const portableDir = path.join(bundleDir, "portable");
const exeName = "that-gpt.exe";
const brandedName = "ThatGPT.exe";

const src = path.join(releaseDir, exeName);
if (!fs.existsSync(src)) {
  console.error(`Release executable not found: ${src}`);
  console.error("Run `npm run build` first.");
  process.exit(1);
}

fs.mkdirSync(portableDir, { recursive: true });
fs.copyFileSync(src, path.join(portableDir, brandedName));
fs.copyFileSync(src, path.join(portableDir, exeName));

console.log("Production artifacts:");
console.log(`  Portable: src-tauri/target/release/bundle/portable/${brandedName}`);
console.log(`  Portable: src-tauri/target/release/bundle/portable/${exeName}`);

const nsisDir = path.join(bundleDir, "nsis");
if (fs.existsSync(nsisDir)) {
  for (const file of fs.readdirSync(nsisDir)) {
    if (file.endsWith(".exe")) {
      console.log(`  Installer: src-tauri/target/release/bundle/nsis/${file}`);
    }
  }
}
