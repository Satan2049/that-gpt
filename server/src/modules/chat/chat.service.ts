import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";
import { createChatCompletion } from "../../providers/ai/ai.client.js";
import { AiClientError, userMessageForAiError } from "../../providers/ai/ai.errors.js";
import { chatMessagesToCompletionMessages } from "../../providers/ai/ai.mapper.js";
import { PromptService } from "../prompt/prompt.service.js";
import type { PromptPreset } from "../prompt/prompt.types.js";
import { ChatRepository } from "./chat.repository.js";
import { validateImages } from "./imageAttachments.js";
import type {
  ChatImageAttachment,
  ChatMessage,
  Conversation,
  ConversationSummary
} from "./chat.types.js";

const NEW_CHAT_TITLE = "New chat";

function errorWithStatus(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

export class ChatService {
  private readonly repo = new ChatRepository();
  private readonly prompts = new PromptService();

  async listConversations(): Promise<ConversationSummary[]> {
    const all = await this.repo.listAll();
    return all.map((c) => ({
      id: c.id,
      title: c.title,
      updatedAt: c.updatedAt
    }));
  }

  async getConversation(id: string): Promise<Conversation | null> {
    return this.repo.findById(id);
  }

  async createConversation(title?: string): Promise<Conversation> {
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: randomUUID(),
      title: title?.trim() || NEW_CHAT_TITLE,
      messages: [],
      createdAt: now,
      updatedAt: now
    };
    await this.repo.save(conversation);
    return conversation;
  }

  async updateConversation(
    id: string,
    patch: { title?: string; promptPresetId?: string | null }
  ): Promise<Conversation | null> {
    const conversation = await this.repo.findById(id);
    if (!conversation) return null;

    if (patch.title !== undefined) {
      conversation.title = patch.title.trim();
    }

    if (patch.promptPresetId !== undefined) {
      if (patch.promptPresetId === null) {
        delete conversation.promptPresetId;
      } else {
        const preset = await this.prompts.getPresetById(patch.promptPresetId);
        if (!preset) {
          throw errorWithStatus("Preset not found", 400);
        }
        conversation.promptPresetId = patch.promptPresetId;
      }
    }

    conversation.updatedAt = new Date().toISOString();
    await this.repo.save(conversation);
    return conversation;
  }

  async deleteConversation(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }

  async sendMessage(
    conversationId: string,
    text: string,
    options?: {
      promptPresetId?: string | null;
      images?: Array<{ mimeType: string; base64: string }>;
    }
  ): Promise<{ assistantMessage: ChatMessage; conversation: Conversation }> {
    const conversation = await this.repo.findById(conversationId);
    if (!conversation) {
      throw errorWithStatus("Conversation not found", 404);
    }

    if (options?.promptPresetId !== undefined) {
      if (options.promptPresetId === null) {
        delete conversation.promptPresetId;
      } else {
        const presetExists = await this.prompts.getPresetById(options.promptPresetId);
        if (!presetExists) {
          throw errorWithStatus("Preset not found", 400);
        }
        conversation.promptPresetId = options.promptPresetId;
      }
    }

    let preset: PromptPreset | null = null;
    if (conversation.promptPresetId) {
      preset = await this.prompts.getPresetById(conversation.promptPresetId);
      if (!preset) {
        delete conversation.promptPresetId;
      }
    }

    const trimmed = text.trim();
    let imageAttachments: ChatImageAttachment[] = [];
    try {
      imageAttachments = validateImages(options?.images);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid images";
      const status =
        e &&
        typeof e === "object" &&
        "statusCode" in e &&
        typeof (e as { statusCode: unknown }).statusCode === "number"
          ? (e as { statusCode: number }).statusCode
          : 400;
      throw errorWithStatus(msg, status);
    }

    if (!trimmed.length && imageAttachments.length === 0) {
      throw errorWithStatus("Message text or at least one image is required", 400);
    }

    const userMessage: ChatMessage = {
      id: randomUUID(),
      conversationId,
      role: "user",
      content: trimmed,
      ...(imageAttachments.length > 0 ? { images: imageAttachments } : {}),
      createdAt: new Date().toISOString()
    };
    conversation.messages.push(userMessage);

    if (conversation.title === NEW_CHAT_TITLE) {
      if (trimmed.length > 0) {
        conversation.title = trimmed.slice(0, 60);
      } else if (imageAttachments.length > 0) {
        conversation.title = "Image message";
      }
    }

    const apiMessages = this.buildApiMessages(conversation, preset);

    let assistantContent: string;
    try {
      assistantContent = await createChatCompletion({
        messages: apiMessages,
        model: preset?.model ?? env.aiModel,
        temperature: preset?.temperature ?? 0.7,
        maxTokens: preset?.maxTokens ?? 2048
      });
    } catch (e) {
      const msg =
        e instanceof AiClientError ? userMessageForAiError(e) : e instanceof Error ? e.message : "AI request failed";
      throw errorWithStatus(msg, 502);
    }

    const assistantMessage: ChatMessage = {
      id: randomUUID(),
      conversationId,
      role: "assistant",
      content: assistantContent,
      createdAt: new Date().toISOString()
    };
    conversation.messages.push(assistantMessage);
    conversation.updatedAt = assistantMessage.createdAt;
    await this.repo.save(conversation);

    return { assistantMessage, conversation };
  }

  private buildApiMessages(conversation: Conversation, preset: PromptPreset | null) {
    const presetSystem = preset?.systemPrompt.trim() ?? "";
    const envSystem = env.aiDefaultSystemPrompt.trim();
    const hasSystem = conversation.messages.some((m) => m.role === "system");

    const historyMessages: ChatMessage[] = [];
    if (!hasSystem) {
      const systemContent = presetSystem || envSystem;
      if (systemContent) {
        historyMessages.push({
          id: "__inline-system__",
          conversationId: conversation.id,
          role: "system",
          content: systemContent,
          createdAt: new Date().toISOString()
        });
      }
    }

    for (const m of conversation.messages) {
      if (m.role === "system" || m.role === "user" || m.role === "assistant") {
        historyMessages.push(m);
      }
    }

    return chatMessagesToCompletionMessages(historyMessages);
  }
}
