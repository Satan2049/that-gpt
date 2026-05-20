import type { FastifyInstance } from "fastify";
import { PromptService } from "./prompt.service.js";
import { createPresetSchema, updatePresetSchema } from "./prompt.schema.js";

export async function registerPromptRoutes(app: FastifyInstance): Promise<void> {
  const service = new PromptService();

  app.get("/api/prompts", async (_req, reply) => {
    const presets = await service.listPresets();
    return reply.send(presets);
  });

  app.get<{ Params: { id: string } }>("/api/prompts/:id", async (req, reply) => {
    const preset = await service.getPresetById(req.params.id);
    if (!preset) {
      return reply.code(404).send({ error: "Preset not found" });
    }
    return reply.send(preset);
  });

  app.post("/api/prompts", async (req, reply) => {
    const parsed = createPresetSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const preset = await service.createPreset(parsed.data);
    return reply.code(201).send(preset);
  });

  app.put<{ Params: { id: string } }>("/api/prompts/:id", async (req, reply) => {
    const parsed = updatePresetSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const preset = await service.updatePreset(req.params.id, parsed.data);
    if (!preset) {
      return reply.code(404).send({ error: "Preset not found" });
    }
    return reply.send(preset);
  });

  app.delete<{ Params: { id: string } }>("/api/prompts/:id", async (req, reply) => {
    const deleted = await service.deletePreset(req.params.id);
    if (!deleted) {
      return reply.code(404).send({ error: "Preset not found" });
    }
    return reply.code(204).send();
  });
}
