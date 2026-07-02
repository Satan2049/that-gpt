import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(root, "src-tauri/icons/android");
const destRoot = path.join(root, "src-tauri/gen/android/app/src/main/res");

function copyTree(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else fs.copyFileSync(from, to);
  }
}

if (!fs.existsSync(srcRoot)) {
  console.error(`Android icon source not found: ${srcRoot}`);
  console.error("Run `npm run generate:brand` to create icons from assets/logo.svg.");
  process.exit(1);
}

if (!fs.existsSync(destRoot)) {
  console.error(`Android res dir not found: ${destRoot}`);
  console.error("Run `npm run android:init` first.");
  process.exit(1);
}

for (const entry of fs.readdirSync(srcRoot, { withFileTypes: true })) {
  const from = path.join(srcRoot, entry.name);
  const to = path.join(destRoot, entry.name);
  if (entry.isDirectory()) copyTree(from, to);
  else fs.copyFileSync(from, to);
}

console.log("Synced ThatGPT launcher icons into Android project.");
