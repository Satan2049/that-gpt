import { invoke } from "../../../shared/lib/tauriInvoke";
import type { ChatMessage, Conversation, ConversationSummary } from "../types/chat.types";

export async function apiListConversations(): Promise<ConversationSummary[]> {
  return invoke<ConversationSummary[]>("list_conversations");
}

export async function apiGetConversation(id: string): Promise<Conversation> {
  return invoke<Conversation>("get_conversation", { id });
}

export async function apiCreateConversation(title?: string): Promise<Conversation> {
  return invoke<Conversation>("create_conversation", {
    body: title ? { title } : {}
  });
}

export async function apiDeleteConversation(id: string): Promise<void> {
  await invoke("delete_conversation", { id });
}

export async function apiPatchConversation(
  id: string,
  patch: { title?: string; promptPresetId?: string | null }
): Promise<Conversation> {
  return invoke<Conversation>("update_conversation", { id, body: patch });
}

export async function apiSendMessage(
  conversationId: string,
  message: string,
  options?: {
    promptPresetId?: string | null;
    images?: Array<{ mimeType: string; base64: string }>;
  }
): Promise<{ assistantMessage: ChatMessage; conversation: Conversation }> {
  return invoke<{ assistantMessage: ChatMessage; conversation: Conversation }>("send_message", {
    body: {
      conversationId,
      message,
      ...(options?.promptPresetId !== undefined
        ? { promptPresetId: options.promptPresetId }
        : {}),
      ...(options?.images?.length ? { images: options.images } : {})
    }
  });
}

export async function apiExportConversation(
  id: string,
  format: "json" | "markdown"
): Promise<string> {
  return invoke<string>("export_conversation", { id, format });
}
