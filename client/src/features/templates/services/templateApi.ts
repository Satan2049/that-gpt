import { invoke } from "../../../shared/lib/tauriInvoke";
import type { Conversation } from "../../chat/types/chat.types";

export type ConversationTemplate = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  systemPrompt?: string;
  model?: string;
  starterMessages: Array<{ role: string; content: string }>;
};

export async function apiListTemplates(): Promise<ConversationTemplate[]> {
  return invoke<ConversationTemplate[]>("list_templates");
}

export async function apiSaveTemplate(
  conversationId: string,
  name: string,
  description?: string
): Promise<ConversationTemplate> {
  return invoke<ConversationTemplate>("save_conversation_template", {
    conversationId,
    body: { name, description }
  });
}

export async function apiDeleteTemplate(templateId: string): Promise<void> {
  await invoke("delete_template", { templateId });
}

export async function apiCreateFromTemplate(
  templateId: string,
  title?: string
): Promise<Conversation> {
  return invoke<Conversation>("create_conversation_from_template", {
    body: { templateId, title }
  });
}
