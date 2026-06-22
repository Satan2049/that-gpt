import { errorMessage } from "../../../shared/lib/errorMessage";
import { create } from "zustand";
import type { AttachmentIndexItem, LibraryFilter } from "../types/library.types";
import * as libraryApi from "../services/libraryApi";

type LibraryState = {
  items: AttachmentIndexItem[];
  total: number;
  filter: LibraryFilter;
  loading: boolean;
  error: string | null;
  loadAttachments: (filter?: LibraryFilter) => Promise<void>;
  setFilter: (filter: LibraryFilter) => void;
  clearError: () => void;
};

export const useLibraryStore = create<LibraryState>((set, get) => ({
  items: [],
  total: 0,
  filter: "all",
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  setFilter: (filter) => {
    set({ filter });
    void get().loadAttachments(filter);
  },

  loadAttachments: async (filter) => {
    const activeFilter = filter ?? get().filter;
    set({ loading: true, error: null, filter: activeFilter });
    try {
      const result = await libraryApi.apiIndexAttachments(activeFilter);
      set({
        items: result.items,
        total: result.total,
        loading: false
      });
    } catch (e) {
      set({
        loading: false,
        error: errorMessage(e, "Failed to load library")
      });
    }
  }
}));

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatAttachmentSize(bytes: number): string {
  return formatBytes(bytes);
}

export function formatAttachmentDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function attachmentDisplayName(item: AttachmentIndexItem): string {
  return item.filename ?? `${item.kind} attachment`;
}
