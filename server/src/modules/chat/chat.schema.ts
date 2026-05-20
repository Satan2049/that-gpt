import { z } from "zod";

const imageEntrySchema = z.object({
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  base64: z.string().min(1)
});

export const sendMessageBodySchema = z.object({
  conversationId: z.string().uuid(),
  message: z.string().max(32000),
  promptPresetId: z.union([z.string().uuid(), z.null()]).optional(),
  images: z.array(imageEntrySchema).max(4).optional()
});

export const createConversationBodySchema = z.object({
  title: z.string().min(1).max(200).optional()
});

export const patchConversationBodySchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    promptPresetId: z.union([z.string().uuid(), z.null()]).optional()
  })
  .refine((data) => data.title !== undefined || data.promptPresetId !== undefined, {
    message: "At least one of title or promptPresetId is required"
  });
