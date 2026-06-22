import { invoke } from "../../../shared/lib/tauriInvoke";
import type {
  ChatMessage,
  Conversation,
  ConversationListView,
  ConversationSummary,
  PendingAttachmentPayload
} from "../types/chat.types";

export async function apiListConversations(
  view: ConversationListView = "active"
): Promise<ConversationSummary[]> {
  return invoke<ConversationSummary[]>("list_conversations", { view });
}

export async function apiGetConversation(id: string): Promise<Conversation> {
  return invoke<Conversation>("get_conversation", { id });
}

export async function apiCreateConversation(options?: {
  title?: string;
  ephemeral?: boolean;
  folderId?: string;
}): Promise<Conversation> {
  return invoke<Conversation>("create_conversation", {
    body: {
      ...(options?.title ? { title: options.title } : {}),
      ...(options?.ephemeral ? { ephemeral: true } : {}),
      ...(options?.folderId ? { folderId: options.folderId } : {})
    }
  });
}

export async function apiDeleteConversation(id: string): Promise<void> {
  await invoke("delete_conversation", { id });
}

export async function apiBurnEphemeralConversation(id: string): Promise<void> {
  await invoke("burn_ephemeral_conversation", { conversationId: id });
}

export async function apiPatchConversation(
  id: string,
  patch: {
    title?: string;
    promptPresetId?: string | null;
    pinned?: boolean;
    archived?: boolean;
    folderId?: string | null;
    tags?: string[];
    lastModel?: string | null;
    temperatureOverride?: number | null;
    maxTokensOverride?: number | null;
    systemPromptOverride?: string | null;
    branchPicks?: Record<string, string>;
  }
): Promise<Conversation> {
  return invoke<Conversation>("update_conversation", { id, body: patch });
}

export async function apiPinConversation(
  conversationId: string,
  pinned: boolean
): Promise<Conversation> {
  return invoke<Conversation>("pin_conversation", { body: { conversationId, pinned } });
}

export async function apiArchiveConversation(
  conversationId: string,
  archived: boolean
): Promise<Conversation> {
  return invoke<Conversation>("archive_conversation", { body: { conversationId, archived } });
}

export async function apiMoveToFolder(
  conversationId: string,
  folderId: string | null
): Promise<Conversation> {
  return invoke<Conversation>("move_to_folder", {
    body: { conversationId, folderId }
  });
}

export async function apiTagConversation(
  conversationId: string,
  tags: string[]
): Promise<Conversation> {
  return invoke<Conversation>("tag_conversation", { body: { conversationId, tags } });
}

export async function apiRegenerateLastResponse(
  conversationId: string,
  createBranch = false
): Promise<{ assistantMessage?: ChatMessage; conversation: Conversation }> {
  return invoke<{ assistantMessage?: ChatMessage; conversation: Conversation }>(
    "regenerate_last_response",
    { conversationId, createBranch }
  );
}

export async function apiForkConversation(
  conversationId: string,
  messageId: string
): Promise<Conversation> {
  return invoke<Conversation>("fork_conversation", {
    body: { conversationId, messageId }
  });
}

export async function apiPreviewApiMessages(
  conversationId: string
): Promise<Array<{ role: string; content: string }>> {
  return invoke<Array<{ role: string; content: string }>>("preview_api_messages", {
    conversationId
  });
}

export async function apiEditMessage(
  conversationId: string,
  messageId: string,
  content: string
): Promise<{ assistantMessage?: ChatMessage; conversation: Conversation }> {
  return invoke<{ assistantMessage?: ChatMessage; conversation: Conversation }>("edit_message", {
    body: { conversationId, messageId, content }
  });
}

export async function apiRetryMessage(
  conversationId: string,
  messageId?: string
): Promise<{ assistantMessage?: ChatMessage; conversation: Conversation }> {
  return invoke<{ assistantMessage?: ChatMessage; conversation: Conversation }>("retry_message", {
    body: {
      conversationId,
      ...(messageId ? { messageId } : {})
    }
  });
}

export async function apiSearchConversations(
  query: string
): Promise<ConversationSummary[]> {
  return invoke<ConversationSummary[]>("search_conversations", { query });
}

export async function apiCancelGeneration(conversationId: string): Promise<boolean> {
  return invoke<boolean>("cancel_generation", { conversationId });
}

export async function apiSendMessage(
  conversationId: string,
  message: string,
  options?: {
    promptPresetId?: string | null;
    images?: Array<{ mimeType: string; base64: string }>;
    attachments?: PendingAttachmentPayload[];
  }
): Promise<{ assistantMessage?: ChatMessage; conversation: Conversation }> {
  return invoke<{ assistantMessage?: ChatMessage; conversation: Conversation }>("send_message", {
    body: {
      conversationId,
      message,
      ...(options?.promptPresetId !== undefined
        ? { promptPresetId: options.promptPresetId }
        : {}),
      ...(options?.images?.length ? { images: options.images } : {}),
      ...(options?.attachments?.length ? { attachments: options.attachments } : {})
    }
  });
}

export async function apiToggleMessageBookmark(
  conversationId: string,
  messageId: string,
  bookmarked: boolean
): Promise<Conversation> {
  return invoke<Conversation>("toggle_message_bookmark", {
    body: { conversationId, messageId, bookmarked }
  });
}

export async function apiExportConversation(
  id: string,
  format: "json" | "markdown" | "html"
): Promise<string> {
  return invoke<string>("export_conversation", { id, format });
}
