export type MessageRole = "system" | "user" | "assistant" | "tool";

export type AttachmentKind = "image" | "audio" | "text" | "pdf";

export type ChatImageAttachment = {
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  base64: string;
};

export type ChatAttachment = {
  kind: AttachmentKind;
  mimeType: string;
  base64: string;
  filename?: string;
  textContent?: string;
};

export type ToolCallRecord = {
  id: string;
  name: string;
  arguments: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  images?: ChatImageAttachment[];
  attachments?: ChatAttachment[];
  toolCalls?: ToolCallRecord[];
  toolCallId?: string;
  toolName?: string;
  bookmarked?: boolean;
  parentId?: string;
  branchId?: string;
};

export type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  promptPresetId?: string;
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
  archived?: boolean;
  folderId?: string;
  tags?: string[];
  ephemeral?: boolean;
  lastModel?: string;
  temperatureOverride?: number;
  maxTokensOverride?: number;
  systemPromptOverride?: string;
  branchPicks?: Record<string, string>;
};

export type ConversationSummary = {
  id: string;
  title: string;
  updatedAt: string;
  pinned?: boolean;
  archived?: boolean;
  folderId?: string;
  tags?: string[];
  ephemeral?: boolean;
};

export type ConversationListView = "active" | "archived" | "all";

export type PendingAttachmentPayload = {
  mimeType: string;
  base64: string;
  filename?: string;
};
