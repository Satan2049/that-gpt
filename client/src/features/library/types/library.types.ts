export type LibraryFilter = "all" | "images" | "files";

export type AttachmentIndexItem = {
  id: string;
  conversationId: string;
  conversationTitle: string;
  messageId: string;
  filename: string | null;
  mimeType: string;
  kind: string;
  sizeBytes: number;
  modifiedAt: string;
};

export type AttachmentIndexResult = {
  items: AttachmentIndexItem[];
  total: number;
};

export type KnowledgeIndexResult = {
  chunkCount: number;
  fileCount: number;
  rootPath: string;
  updatedAt: string;
};
