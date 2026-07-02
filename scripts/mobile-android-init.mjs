import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";
const npx = isWin ? "npx.cmd" : "npx";

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: isWin,
    env: { ...process.env, CI: "true" }
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(npx, ["tauri", "android", "init", "--ci"]);
run(process.execPath, [path.join(root, "scripts/patch-android-manifest.mjs")]);
run(process.execPath, [path.join(root, "scripts/sync-android-icons.mjs")]);
run(process.execPath, [path.join(root, "scripts/patch-android-gradle.mjs")]);
