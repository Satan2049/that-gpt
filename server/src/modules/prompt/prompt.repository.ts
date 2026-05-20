import { promises as fs } from "node:fs";
import path from "node:path";
import type { PromptPreset } from "./prompt.types.js";

const PROMPTS_DIR = path.join(process.cwd(), "data", "prompts");

async function ensurePromptsDir(): Promise<void> {
  await fs.mkdir(PROMPTS_DIR, { recursive: true });
}

function presetFilePath(id: string): string {
  return path.join(PROMPTS_DIR, `${id}.json`);
}

export class PromptRepository {
  async save(preset: PromptPreset): Promise<void> {
    await ensurePromptsDir();
    await fs.writeFile(presetFilePath(preset.id), JSON.stringify(preset, null, 2), "utf8");
  }

  async findById(id: string): Promise<PromptPreset | null> {
    try {
      const raw = await fs.readFile(presetFilePath(id), "utf8");
      return JSON.parse(raw) as PromptPreset;
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await fs.unlink(presetFilePath(id));
      return true;
    } catch {
      return false;
    }
  }

  async listIds(): Promise<string[]> {
    await ensurePromptsDir();
    const entries = await fs.readdir(PROMPTS_DIR);
    return entries
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.replace(/\.json$/u, ""));
  }

  async listAll(): Promise<PromptPreset[]> {
    const ids = await this.listIds();
    const presets: PromptPreset[] = [];
    for (const id of ids) {
      const preset = await this.findById(id);
      if (preset) presets.push(preset);
    }
    return presets.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }
}
