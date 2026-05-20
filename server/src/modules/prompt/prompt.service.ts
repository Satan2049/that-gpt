import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";
import { PromptRepository } from "./prompt.repository.js";
import type { PromptPreset } from "./prompt.types.js";

export class PromptService {
  private readonly repo = new PromptRepository();

  async listPresets(): Promise<PromptPreset[]> {
    await this.ensureBuiltInPresetsIfEmpty();
    return this.repo.listAll();
  }

  async getPresetById(id: string): Promise<PromptPreset | null> {
    await this.ensureBuiltInPresetsIfEmpty();
    return this.repo.findById(id);
  }

  async createPreset(input: {
    name: string;
    systemPrompt: string;
    temperature?: number;
    maxTokens?: number;
    model?: string;
  }): Promise<PromptPreset> {
    await this.ensureBuiltInPresetsIfEmpty();
    const now = new Date().toISOString();
    const preset: PromptPreset = {
      id: randomUUID(),
      name: input.name.trim(),
      systemPrompt: input.systemPrompt,
      temperature: input.temperature ?? 0.7,
      maxTokens: input.maxTokens ?? 2048,
      model: input.model?.trim() || env.aiModel,
      createdAt: now,
      updatedAt: now
    };
    await this.repo.save(preset);
    return preset;
  }

  async updatePreset(
    id: string,
    input: {
      name: string;
      systemPrompt: string;
      temperature: number;
      maxTokens: number;
      model: string;
    }
  ): Promise<PromptPreset | null> {
    const existing = await this.repo.findById(id);
    if (!existing) return null;
    const now = new Date().toISOString();
    const preset: PromptPreset = {
      ...existing,
      name: input.name.trim(),
      systemPrompt: input.systemPrompt,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
      model: input.model.trim(),
      updatedAt: now
    };
    await this.repo.save(preset);
    return preset;
  }

  async deletePreset(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }

  private async ensureBuiltInPresetsIfEmpty(): Promise<void> {
    const ids = await this.repo.listIds();
    if (ids.length > 0) return;

    const now = new Date().toISOString();
    const defaultSystem = env.aiDefaultSystemPrompt.trim() || "You are a helpful assistant.";
    const builtIns: Omit<PromptPreset, "id" | "createdAt" | "updatedAt">[] = [
      {
        name: "General Assistant",
        systemPrompt: defaultSystem,
        temperature: 0.7,
        maxTokens: 2048,
        model: env.aiModel
      },
      {
        name: "Code Reviewer",
        systemPrompt:
          "You review code for correctness, security, and clarity. Be concise and actionable.",
        temperature: 0.4,
        maxTokens: 4096,
        model: env.aiModel
      }
    ];

    for (const template of builtIns) {
      const preset: PromptPreset = {
        id: randomUUID(),
        ...template,
        createdAt: now,
        updatedAt: now
      };
      await this.repo.save(preset);
    }
  }
}
