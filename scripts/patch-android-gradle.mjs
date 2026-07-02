import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const gradleCandidates = [
  path.join(root, "src-tauri/gen/android/app/build.gradle.kts"),
  path.join(root, "src-tauri/gen/android/app/build.gradle")
];

const gradlePath = gradleCandidates.find((candidate) => fs.existsSync(candidate));
if (!gradlePath) {
  console.error("Android app build.gradle not found. Run `npm run android:init` first.");
  process.exit(1);
}

let gradle = fs.readFileSync(gradlePath, "utf8");
const abiLine = 'abiFilters "arm64-v8a", "armeabi-v7a"';
const abiKotlin = 'abiFilters += listOf("arm64-v8a", "armeabi-v7a")';

if (gradle.includes("arm64-v8a")) {
  console.log("Android Gradle already limits ABIs.");
  process.exit(0);
}

if (gradlePath.endsWith(".kts")) {
  if (gradle.includes("defaultConfig {")) {
    gradle = gradle.replace(
      /defaultConfig\s*\{/,
      `defaultConfig {\n        ndk {\n            ${abiKotlin}\n        }`
    );
  } else {
    console.error("Could not patch Kotlin Gradle defaultConfig block.");
    process.exit(1);
  }
} else if (gradle.includes("defaultConfig {")) {
  gradle = gradle.replace(
    /defaultConfig\s*\{/,
    `defaultConfig {\n        ndk {\n            ${abiLine}\n        }`
  );
} else {
  console.error("Could not patch Gradle defaultConfig block.");
  process.exit(1);
}

fs.writeFileSync(gradlePath, gradle);
console.log("Patched Android Gradle to bundle arm64-v8a + armeabi-v7a only.");
