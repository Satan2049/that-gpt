export type MessageRole = "system" | "user" | "assistant";

export type ChatImageAttachment = {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  base64: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  images?: ChatImageAttachment[];
};

export type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  promptPresetId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ConversationSummary = {
  id: string;
  title: string;
  updatedAt: string;
};
