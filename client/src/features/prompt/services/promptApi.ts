import type { PromptPreset } from "../types/prompt.types";

async function parseError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const parsed = JSON.parse(text) as { error?: unknown };
    if (typeof parsed.error === "string") return parsed.error;
    return text || res.statusText;
  } catch {
    return text || res.statusText;
  }
}

export async function apiListPrompts(): Promise<PromptPreset[]> {
  const res = await fetch("/api/prompts");
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<PromptPreset[]>;
}

export async function apiCreatePreset(input: {
  name: string;
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}): Promise<PromptPreset> {
  const res = await fetch("/api/prompts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<PromptPreset>;
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
  const res = await fetch(`/api/prompts/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<PromptPreset>;
}

export async function apiDeletePreset(id: string): Promise<void> {
  const res = await fetch(`/api/prompts/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
  if (!res.ok) throw new Error(await parseError(res));
}
