import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = path.join(root, "assets");

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root, shell: true });
}

function renderSvg(svgPath, pngPath, width, height) {
  const input = path.relative(root, svgPath);
  const output = path.relative(root, pngPath);
  run(
    `npx --yes @resvg/resvg-js-cli "${input}" "${output}" --fit-width ${width} --fit-height ${height}`
  );
}

fs.mkdirSync(assetsDir, { recursive: true });

renderSvg(path.join(assetsDir, "logo.svg"), path.join(assetsDir, "logo-square.png"), 1024, 1024);
renderSvg(path.join(assetsDir, "banner.svg"), path.join(assetsDir, "banner.png"), 1200, 400);

console.log("Generating Tauri icon set…");
run(`npx --yes @tauri-apps/cli icon "${path.relative(root, path.join(assetsDir, "logo-square.png"))}"`);

console.log("Brand assets updated.");
