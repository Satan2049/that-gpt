import { z } from "zod";

export const createPresetSchema = z.object({
  name: z.string().min(1).max(120),
  systemPrompt: z.string().max(32000),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(128000).optional(),
  model: z.string().min(1).max(200).optional()
});

export const updatePresetSchema = z.object({
  name: z.string().min(1).max(120),
  systemPrompt: z.string().max(32000),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().min(1).max(128000),
  model: z.string().min(1).max(200)
});
