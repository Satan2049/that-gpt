import type { ChatMessage, Conversation, ConversationSummary } from "../types/chat.types";

async function parseError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const parsed = JSON.parse(text) as { error?: unknown };
    if (typeof parsed.error === "string") return parsed.error;
    if (parsed.error !== undefined) {
      return typeof parsed.error === "object"
        ? JSON.stringify(parsed.error)
        : String(parsed.error);
    }
    return text || res.statusText;
  } catch {
    return text || res.statusText;
  }
}

export async function apiListConversations(): Promise<ConversationSummary[]> {
  const res = await fetch("/api/chat/conversations");
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<ConversationSummary[]>;
}

export async function apiGetConversation(id: string): Promise<Conversation> {
  const res = await fetch(`/api/chat/conversations/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<Conversation>;
}

export async function apiCreateConversation(title?: string): Promise<Conversation> {
  const res = await fetch("/api/chat/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(title ? { title } : {})
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<Conversation>;
}

export async function apiDeleteConversation(id: string): Promise<void> {
  const res = await fetch(`/api/chat/conversations/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function apiPatchConversation(
  id: string,
  patch: { title?: string; promptPresetId?: string | null }
): Promise<Conversation> {
  const res = await fetch(`/api/chat/conversations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch)
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<Conversation>;
}

export async function apiSendMessage(
  conversationId: string,
  message: string,
  options?: {
    promptPresetId?: string | null;
    images?: Array<{ mimeType: string; base64: string }>;
  }
): Promise<{ assistantMessage: ChatMessage; conversation: Conversation }> {
  const res = await fetch("/api/chat/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationId,
      message,
      ...(options?.promptPresetId !== undefined
        ? { promptPresetId: options.promptPresetId }
        : {}),
      ...(options?.images?.length ? { images: options.images } : {})
    })
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ assistantMessage: ChatMessage; conversation: Conversation }>;
}
