export type FolderSource = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  addedAt: string;
};

export type Folder = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  instructions?: string | null;
  sources?: FolderSource[];
};
