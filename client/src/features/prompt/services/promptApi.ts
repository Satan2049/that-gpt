import { invoke } from "../../../shared/lib/tauriInvoke";
import type { PromptPreset } from "../types/prompt.types";

export async function apiListPrompts(): Promise<PromptPreset[]> {
  return invoke<PromptPreset[]>("list_prompts");
}

export async function apiCreatePreset(input: {
  name: string;
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}): Promise<PromptPreset> {
  return invoke<PromptPreset>("create_prompt", { body: input });
}

export async function apiUpdatePreset(
  id: string,
  input: {
    name: string;
    systemPrompt: string;
    temperature: number;
    maxTokens: number;
    model: string;
  }
): Promise<PromptPreset> {
  return invoke<PromptPreset>("update_prompt", { id, body: input });
}

export async function apiDeletePreset(id: string): Promise<void> {
  await invoke("delete_prompt", { id });
}
