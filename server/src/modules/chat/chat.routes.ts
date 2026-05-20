import type { FastifyInstance } from "fastify";
import { ChatService } from "./chat.service.js";
import {
  createConversationBodySchema,
  patchConversationBodySchema,
  sendMessageBodySchema
} from "./chat.schema.js";

function getErrorStatusCode(error: unknown): number {
  if (
    error &&
    typeof error === "object" &&
    "statusCode" in error &&
    typeof (error as { statusCode: unknown }).statusCode === "number"
  ) {
    return (error as { statusCode: number }).statusCode;
  }
  return 500;
}

export async function registerChatRoutes(app: FastifyInstance): Promise<void> {
  const service = new ChatService();

  app.get("/api/chat/conversations", async (_req, reply) => {
    const list = await service.listConversations();
    return reply.send(list);
  });

  app.get<{ Params: { id: string } }>("/api/chat/conversations/:id", async (req, reply) => {
    const conversation = await service.getConversation(req.params.id);
    if (!conversation) {
      return reply.code(404).send({ error: "Conversation not found" });
    }
    return reply.send(conversation);
  });

  app.post("/api/chat/conversations", async (req, reply) => {
    const parsed = createConversationBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const body = parsed.data;
    const conversation = await service.createConversation(body.title);
    return reply.code(201).send(conversation);
  });

  app.patch<{ Params: { id: string } }>("/api/chat/conversations/:id", async (req, reply) => {
    const parsed = patchConversationBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    try {
      const conversation = await service.updateConversation(req.params.id, parsed.data);
      if (!conversation) {
        return reply.code(404).send({ error: "Conversation not found" });
      }
      return reply.send(conversation);
    } catch (e) {
      const status = getErrorStatusCode(e);
      const message = e instanceof Error ? e.message : "Unknown error";
      return reply.code(status).send({ error: message });
    }
  });

  app.delete<{ Params: { id: string } }>(
    "/api/chat/conversations/:id",
    async (req, reply) => {
      const deleted = await service.deleteConversation(req.params.id);
      if (!deleted) {
        return reply.code(404).send({ error: "Conversation not found" });
      }
      return reply.code(204).send();
    }
  );

  app.post("/api/chat/send", async (req, reply) => {
    const parsed = sendMessageBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    try {
      const result = await service.sendMessage(
        parsed.data.conversationId,
        parsed.data.message,
        { promptPresetId: parsed.data.promptPresetId, images: parsed.data.images }
      );
      return reply.send(result);
    } catch (e) {
      const status = getErrorStatusCode(e);
      const message = e instanceof Error ? e.message : "Unknown error";
      return reply.code(status).send({ error: message });
    }
  });
}
