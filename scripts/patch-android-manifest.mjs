import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(
  root,
  "src-tauri/gen/android/app/src/main/AndroidManifest.xml"
);

if (!fs.existsSync(manifestPath)) {
  console.error(`Android manifest not found: ${manifestPath}`);
  console.error("Run `npm run android:init` first.");
  process.exit(1);
}

const extraPermissions = [
  "android.permission.RECORD_AUDIO",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.VIBRATE"
];

let xml = fs.readFileSync(manifestPath, "utf8");
let changed = false;

for (const permission of extraPermissions) {
  const line = `    <uses-permission android:name="${permission}" />`;
  if (!xml.includes(permission)) {
    xml = xml.replace(
      '<uses-permission android:name="android.permission.INTERNET" />',
      `<uses-permission android:name="android.permission.INTERNET" />\n${line}`
    );
    changed = true;
  }
}

if (changed) {
  fs.writeFileSync(manifestPath, xml);
  console.log("Patched AndroidManifest.xml with mobile permissions.");
} else {
  console.log("AndroidManifest.xml already contains mobile permissions.");
}
