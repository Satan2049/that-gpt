import type { ChatCompletionContentPart, ChatCompletionMessage } from "./ai.types.js";
import type { ChatImageAttachment, ChatMessage } from "../../modules/chat/chat.types.js";

export function userContentForApi(
  text: string,
  images?: ChatImageAttachment[]
): string | ChatCompletionContentPart[] {
  if (!images?.length) {
    return text;
  }

  const parts: ChatCompletionContentPart[] = [];
  const trimmed = text.trim();
  if (trimmed) {
    parts.push({ type: "text", text: trimmed });
  }
  for (const img of images) {
    parts.push({
      type: "image_url",
      image_url: { url: `data:${img.mimeType};base64,${img.base64}` }
    });
  }
  return parts;
}

export function chatMessagesToCompletionMessages(
  messages: ChatMessage[]
): ChatCompletionMessage[] {
  const out: ChatCompletionMessage[] = [];
  for (const m of messages) {
    if (m.role === "system") {
      out.push({ role: "system", content: m.content });
    } else if (m.role === "assistant") {
      out.push({ role: "assistant", content: m.content });
    } else if (m.role === "user") {
      out.push({
        role: "user",
        content: userContentForApi(m.content, m.images)
      });
    }
  }
  return out;
}
