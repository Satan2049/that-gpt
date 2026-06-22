import { errorMessage } from "../../../shared/lib/errorMessage";
import { conversationExportFilename, downloadTextFile } from "../../../shared/lib/downloadTextFile";
import { toast } from "../../../shared/components/toastStore";
import { create } from "zustand";
import type { Conversation, ConversationSummary, PendingAttachmentPayload } from "../types/chat.types";
import type { TokenUsage, KnowledgeCitation } from "../../settings/types/models.types";
import type { Folder } from "../../folders/types/folder.types";
import * as chatApi from "../services/chatApi";
import * as folderApi from "../../folders/services/folderApi";

type StreamStartPayload = {
  conversationId: string;
  messageId: string;
};

type StreamChunkPayload = {
  conversationId: string;
  messageId: string;
  delta: string;
};

type StreamCancelledPayload = {
  conversationId: string;
  messageId: string;
};

type ToolCallPayload = {
  conversationId: string;
  toolCallId: string;
  name: string;
  arguments: string;
};

type ToolResultPayload = {
  conversationId: string;
  toolCallId: string;
  name: string;
  content: string;
};

export type ToolActivityItem = {
  id: string;
  kind: "call" | "result";
  name: string;
  detail: string;
};

type ChatUsagePayload = {
  conversationId: string;
  messageId: string;
  usage: TokenUsage;
};

type ChatCitationsPayload = {
  conversationId: string;
  messageId: string;
  citations: KnowledgeCitation[];
};

type GeneratedImagePayload = {
  conversationId: string;
  messageId: string;
  mimeType: string;
  base64: string;
};

export type SidebarPanel = "chats" | "projects" | "archived" | "library";

type ChatState = {
  summaries: ConversationSummary[];
  folders: Folder[];
  sidebarPanel: SidebarPanel;
  selectedFolderId: string | null;
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  loadingList: boolean;
  loadingConversation: boolean;
  sending: boolean;
  streamingMessageId: string | null;
  toolActivity: ToolActivityItem[];
  exporting: boolean;
  error: string | null;
  retryAfterMessageId: string | null;
  editingMessageId: string | null;
  searchQuery: string;
  lastUsage: TokenUsage | null;
  citationsByMessageId: Record<string, KnowledgeCitation[]>;
  showBookmarksOnly: boolean;
  loadConversations: () => Promise<void>;
  loadFolders: () => Promise<void>;
  setSidebarPanel: (panel: SidebarPanel) => Promise<void>;
  setSelectedFolderId: (folderId: string | null) => void;
  searchConversations: (query: string) => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  createConversation: (options?: { ephemeral?: boolean; folderId?: string }) => Promise<void>;
  createConversationInFolder: (folderId: string) => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  patchFolder: (
    id: string,
    patch: { name?: string; instructions?: string | null }
  ) => Promise<void>;
  addFolderSource: (
    folderId: string,
    filename: string,
    mimeType: string,
    dataBase64: string
  ) => Promise<void>;
  removeFolderSource: (folderId: string, sourceId: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  pinConversation: (id: string, pinned: boolean) => Promise<void>;
  archiveConversation: (id: string, archived: boolean) => Promise<void>;
  moveConversationToFolder: (id: string, folderId: string | null) => Promise<void>;
  burnActiveEphemeral: () => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  patchConversation: (patch: {
    title?: string;
    promptPresetId?: string | null;
    lastModel?: string | null;
    temperatureOverride?: number | null;
    maxTokensOverride?: number | null;
    systemPromptOverride?: string | null;
    branchPicks?: Record<string, string>;
  }) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  sendMessage: (text: string, attachments?: PendingAttachmentPayload[]) => Promise<void>;
  regenerateLastResponse: (createBranch?: boolean) => Promise<void>;
  forkConversation: (messageId: string) => Promise<void>;
  selectBranch: (parentId: string, assistantId: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  retryMessage: (messageId?: string) => Promise<void>;
  setEditingMessageId: (messageId: string | null) => void;
  stopGeneration: () => Promise<void>;
  exportActiveConversation: (format: "json" | "markdown" | "html") => Promise<void>;
  onStreamStart: (payload: StreamStartPayload) => void;
  onStreamChunk: (payload: StreamChunkPayload) => void;
  onStreamCancelled: (payload: StreamCancelledPayload) => void;
  onToolCall: (payload: ToolCallPayload) => void;
  onToolResult: (payload: ToolResultPayload) => void;
  onChatUsage: (payload: ChatUsagePayload) => void;
  onChatCitations: (payload: ChatCitationsPayload) => void;
  onGeneratedImage: (payload: GeneratedImagePayload) => void;
  copyConversationMarkdown: () => Promise<void>;
  toggleMessageBookmark: (messageId: string, bookmarked: boolean) => Promise<void>;
  setShowBookmarksOnly: (value: boolean) => void;
  clearError: () => void;
};

async function fetchSummariesForPanel(panel: SidebarPanel) {
  const view = panel === "archived" ? "archived" : "active";
  return chatApi.apiListConversations(view);
}

export const useChatStore = create<ChatState>((set, get) => ({
  summaries: [],
  folders: [],
  sidebarPanel: "chats",
  selectedFolderId: null,
  activeConversationId: null,
  activeConversation: null,
  loadingList: false,
  loadingConversation: false,
  sending: false,
  streamingMessageId: null,
  toolActivity: [],
  searchQuery: "",
  exporting: false,
  error: null,
  retryAfterMessageId: null,
  editingMessageId: null,
  lastUsage: null,
  citationsByMessageId: {},
  showBookmarksOnly: false,

  clearError: () => set({ error: null, retryAfterMessageId: null }),

  setEditingMessageId: (messageId) => set({ editingMessageId: messageId }),

  onStreamStart: ({ conversationId, messageId }) => {
    set((state) => {
      if (state.activeConversationId !== conversationId || !state.activeConversation) {
        return state;
      }

      if (state.activeConversation.messages.some((m) => m.id === messageId)) {
        return { streamingMessageId: messageId };
      }

      return {
        streamingMessageId: messageId,
        activeConversation: {
          ...state.activeConversation,
          messages: [
            ...state.activeConversation.messages,
            {
              id: messageId,
              conversationId,
              role: "assistant",
              content: "",
              createdAt: new Date().toISOString()
            }
          ]
        }
      };
    });
  },

  onStreamChunk: ({ conversationId, messageId, delta }) => {
    set((state) => {
      if (state.activeConversationId !== conversationId || !state.activeConversation) {
        return state;
      }

      return {
        activeConversation: {
          ...state.activeConversation,
          messages: state.activeConversation.messages.map((message) =>
            message.id === messageId
              ? { ...message, content: message.content + delta }
              : message
          )
        }
      };
    });
  },

  onStreamCancelled: ({ conversationId, messageId }) => {
    set((state) => {
      if (state.activeConversationId !== conversationId || !state.activeConversation) {
        return state;
      }

      return {
        streamingMessageId: null,
        sending: false,
        toolActivity: [],
        activeConversation: {
          ...state.activeConversation,
          messages: state.activeConversation.messages.filter(
            (message) => !(message.id === messageId && message.content === "")
          )
        }
      };
    });
  },

  onToolCall: ({ conversationId, toolCallId, name, arguments: args }) => {
    set((state) => {
      if (state.activeConversationId !== conversationId) return state;
      return {
        toolActivity: [
          ...state.toolActivity,
          { id: toolCallId, kind: "call", name, detail: args }
        ]
      };
    });
  },

  onToolResult: ({ conversationId, toolCallId, name, content }) => {
    set((state) => {
      if (state.activeConversationId !== conversationId) return state;
      return {
        toolActivity: [
          ...state.toolActivity,
          {
            id: `${toolCallId}-result`,
            kind: "result",
            name,
            detail: content.length > 240 ? `${content.slice(0, 240)}…` : content
          }
        ]
      };
    });
  },

  onChatUsage: ({ conversationId, usage }) => {
    set((state) => {
      if (state.activeConversationId !== conversationId) return state;
      return { lastUsage: usage };
    });
  },

  onChatCitations: ({ conversationId, messageId, citations }) => {
    set((state) => {
      if (state.activeConversationId !== conversationId) return state;
      return {
        citationsByMessageId: {
          ...state.citationsByMessageId,
          [messageId]: citations
        }
      };
    });
  },

  onGeneratedImage: ({ conversationId, messageId, mimeType, base64 }) => {
    const imageMime =
      mimeType === "image/jpeg" ||
      mimeType === "image/png" ||
      mimeType === "image/webp" ||
      mimeType === "image/gif"
        ? mimeType
        : "image/png";

    set((state) => {
      if (state.activeConversationId !== conversationId || !state.activeConversation) {
        return state;
      }
      return {
        activeConversation: {
          ...state.activeConversation,
          messages: state.activeConversation.messages.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  images: [
                    ...(message.images ?? []),
                    { mimeType: imageMime, base64 }
                  ]
                }
              : message
          )
        }
      };
    });
  },

  copyConversationMarkdown: async () => {
    const { activeConversationId } = get();
    if (!activeConversationId) return;
    try {
      const markdown = await chatApi.apiExportConversation(activeConversationId, "markdown");
      await navigator.clipboard.writeText(markdown);
      toast("Conversation copied as Markdown");
    } catch (e) {
      set({ error: errorMessage(e, "Failed to copy conversation") });
    }
  },

  toggleMessageBookmark: async (messageId, bookmarked) => {
    const id = get().activeConversationId;
    if (!id) return;
    try {
      const conversation = await chatApi.apiToggleMessageBookmark(id, messageId, bookmarked);
      set({ activeConversation: conversation });
    } catch (e) {
      set({ error: errorMessage(e, "Failed to update bookmark") });
    }
  },

  setShowBookmarksOnly: (value) => set({ showBookmarksOnly: value }),

  loadConversations: async () => {
    set({ loadingList: true, error: null });
    try {
      const { sidebarPanel } = get();
      const view = sidebarPanel === "archived" ? "archived" : "active";
      const summaries = await chatApi.apiListConversations(view);
      set({ summaries, loadingList: false, searchQuery: "" });
      const { activeConversationId } = get();
      if (!activeConversationId && summaries.length > 0 && sidebarPanel === "chats") {
        await get().selectConversation(summaries[0].id);
      }
    } catch (e) {
      set({
        loadingList: false,
        error: errorMessage(e, "Failed to load conversations")
      });
    }
  },

  loadFolders: async () => {
    try {
      const folders = await folderApi.apiListFolders();
      set({ folders });
    } catch (e) {
      set({ error: errorMessage(e, "Failed to load projects") });
    }
  },

  setSidebarPanel: async (panel) => {
    set({ sidebarPanel: panel, searchQuery: "" });
    await get().loadConversations();
    if (panel === "projects") {
      await get().loadFolders();
    }
  },

  setSelectedFolderId: (folderId) => set({ selectedFolderId: folderId }),

  searchConversations: async (query) => {
    set({ loadingList: true, error: null, searchQuery: query });
    try {
      const summaries = await chatApi.apiSearchConversations(query);
      set({ summaries, loadingList: false });
    } catch (e) {
      set({
        loadingList: false,
        error: errorMessage(e, "Search failed")
      });
    }
  },

  selectConversation: async (id: string) => {
    set({
      loadingConversation: true,
      error: null,
      activeConversationId: id,
      streamingMessageId: null,
      lastUsage: null,
      citationsByMessageId: {}
    });
    try {
      const conversation = await chatApi.apiGetConversation(id);
      set({ activeConversation: conversation, loadingConversation: false });
    } catch (err) {
      set({
        loadingConversation: false,
        error: errorMessage(err, "Failed to load conversation")
      });
    }
  },

  createConversation: async (options) => {
    set({ error: null });
    try {
      const folderId = options?.folderId ?? get().selectedFolderId ?? undefined;
      const conversation = await chatApi.apiCreateConversation({
        ephemeral: options?.ephemeral,
        folderId: options?.ephemeral ? undefined : folderId
      });
      if (!conversation.ephemeral) {
        const summaries = await chatApi.apiListConversations("active");
        set((state) => ({
          summaries,
          activeConversationId: conversation.id,
          activeConversation: conversation,
          streamingMessageId: null,
          sidebarPanel: "chats"
        }));
      } else {
        set({
          summaries: [conversation, ...get().summaries.filter((s) => s.id !== conversation.id)],
          activeConversationId: conversation.id,
          activeConversation: conversation,
          streamingMessageId: null,
          sidebarPanel: "chats"
        });
      }
    } catch (e) {
      set({
        error: errorMessage(e, "Failed to create conversation")
      });
    }
  },

  createConversationInFolder: async (folderId) => {
    await get().createConversation({ folderId });
  },

  patchFolder: async (id, patch) => {
    set({ error: null });
    try {
      const updated = await folderApi.apiPatchFolder(id, patch);
      set((state) => ({
        folders: state.folders.map((f) => (f.id === id ? updated : f))
      }));
    } catch (e) {
      set({ error: errorMessage(e, "Failed to save project") });
    }
  },

  addFolderSource: async (folderId, filename, mimeType, dataBase64) => {
    set({ error: null });
    try {
      const updated = await folderApi.apiAddFolderSource(folderId, filename, mimeType, dataBase64);
      set((state) => ({
        folders: state.folders.map((f) => (f.id === folderId ? updated : f))
      }));
    } catch (e) {
      set({ error: errorMessage(e, "Failed to add project file") });
    }
  },

  removeFolderSource: async (folderId, sourceId) => {
    set({ error: null });
    try {
      const updated = await folderApi.apiRemoveFolderSource(folderId, sourceId);
      set((state) => ({
        folders: state.folders.map((f) => (f.id === folderId ? updated : f))
      }));
    } catch (e) {
      set({ error: errorMessage(e, "Failed to remove project file") });
    }
  },

  createFolder: async (name) => {
    set({ error: null });
    try {
      const folder = await folderApi.apiCreateFolder(name);
      await get().loadFolders();
      set({ selectedFolderId: folder.id, sidebarPanel: "projects" });
    } catch (e) {
      set({ error: errorMessage(e, "Failed to create project") });
    }
  },

  deleteFolder: async (id) => {
    set({ error: null });
    try {
      await folderApi.apiDeleteFolder(id);
      if (get().selectedFolderId === id) {
        set({ selectedFolderId: null });
      }
      await get().loadFolders();
      await get().loadConversations();
    } catch (e) {
      set({ error: errorMessage(e, "Failed to delete project") });
    }
  },

  pinConversation: async (id, pinned) => {
    set({ error: null });
    try {
      await chatApi.apiPinConversation(id, pinned);
      await get().loadConversations();
    } catch (e) {
      set({ error: errorMessage(e, pinned ? "Failed to pin chat" : "Failed to unpin chat") });
    }
  },

  archiveConversation: async (id, archived) => {
    set({ error: null });
    try {
      await chatApi.apiArchiveConversation(id, archived);
      const wasActive = get().activeConversationId === id;
      await get().loadConversations();
      if (wasActive && archived) {
        const summaries = get().summaries;
        if (summaries.length > 0) {
          await get().selectConversation(summaries[0].id);
        } else {
          set({ activeConversationId: null, activeConversation: null });
        }
      }
    } catch (e) {
      set({ error: errorMessage(e, archived ? "Failed to archive chat" : "Failed to restore chat") });
    }
  },

  moveConversationToFolder: async (id, folderId) => {
    set({ error: null });
    try {
      await chatApi.apiMoveToFolder(id, folderId);
      await get().loadConversations();
    } catch (e) {
      set({ error: errorMessage(e, "Failed to move chat") });
    }
  },

  burnActiveEphemeral: async () => {
    const { activeConversationId, activeConversation } = get();
    if (!activeConversationId || !activeConversation?.ephemeral) return;

    set({ error: null });
    try {
      await chatApi.apiBurnEphemeralConversation(activeConversationId);
      const summaries = get().summaries.filter((s) => s.id !== activeConversationId);
      set({ summaries, activeConversationId: null, activeConversation: null });
      if (summaries.length > 0) {
        await get().selectConversation(summaries[0].id);
      } else {
        await get().createConversation();
      }
    } catch (e) {
      set({ error: errorMessage(e, "Failed to burn temporary chat") });
    }
  },

  deleteConversation: async (id: string) => {
    set({ error: null });
    try {
      await chatApi.apiDeleteConversation(id);
      const summaries = await fetchSummariesForPanel(get().sidebarPanel);
      const wasActive = get().activeConversationId === id;
      set({ summaries });
      if (wasActive) {
        if (summaries.length > 0) {
          await get().selectConversation(summaries[0].id);
        } else {
          set({ activeConversationId: null, activeConversation: null, streamingMessageId: null });
        }
      }
    } catch (e) {
      set({
        error: errorMessage(e, "Failed to delete conversation")
      });
    }
  },

  patchConversation: async (patch) => {
    const id = get().activeConversationId;
    if (!id) return;

    set({ error: null });
    try {
      const conversation = await chatApi.apiPatchConversation(id, patch);
      const summaries = get().searchQuery.trim()
        ? await chatApi.apiSearchConversations(get().searchQuery)
        : await fetchSummariesForPanel(get().sidebarPanel);
      set({
        activeConversation: conversation,
        summaries
      });
    } catch (e) {
      set({
        error: errorMessage(e, "Failed to update conversation")
      });
    }
  },

  renameConversation: async (id, title) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    set({ error: null });
    try {
      const conversation = await chatApi.apiPatchConversation(id, { title: trimmed });
      const summaries = get().searchQuery.trim()
        ? await chatApi.apiSearchConversations(get().searchQuery)
        : await fetchSummariesForPanel(get().sidebarPanel);
      set((state) => ({
        summaries,
        activeConversation:
          state.activeConversationId === id ? conversation : state.activeConversation
      }));
    } catch (e) {
      set({
        error: errorMessage(e, "Failed to rename conversation")
      });
    }
  },

  sendMessage: async (text, attachments) => {
    const trimmed = text.trim();
    const { activeConversationId, activeConversation } = get();
    if ((!trimmed && !(attachments?.length ?? 0)) || !activeConversationId || !activeConversation) {
      return;
    }

    const optimisticUserId = crypto.randomUUID();
    const imageAttachments = attachments?.filter((a) => a.mimeType.startsWith("image/"));
    const optimisticUser = {
      id: optimisticUserId,
      conversationId: activeConversationId,
      role: "user" as const,
      content: trimmed,
      createdAt: new Date().toISOString(),
      ...(imageAttachments?.length
        ? {
            images: imageAttachments.map((img) => ({
              mimeType: img.mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
              base64: img.base64
            }))
          }
        : {}),
      ...(attachments?.length
        ? {
            attachments: attachments.map((a) => ({
              kind: a.mimeType.startsWith("image/")
                ? ("image" as const)
                : a.mimeType.startsWith("audio/")
                  ? ("audio" as const)
                  : a.mimeType === "application/pdf"
                    ? ("pdf" as const)
                    : ("text" as const),
              mimeType: a.mimeType,
              base64: a.base64,
              filename: a.filename
            }))
          }
        : {})
    };

    set({
      sending: true,
      streamingMessageId: null,
      toolActivity: [],
      error: null,
      retryAfterMessageId: null,
      editingMessageId: null,
      activeConversation: {
        ...activeConversation,
        messages: [...activeConversation.messages, optimisticUser]
      }
    });

    try {
      const result = await chatApi.apiSendMessage(activeConversationId, trimmed, {
        ...(attachments?.length ? { attachments } : {})
      });
      const summaries = await fetchSummariesForPanel(get().sidebarPanel);
      set({
        activeConversation: result.conversation,
        sending: false,
        streamingMessageId: null,
        toolActivity: [],
        retryAfterMessageId: null,
        summaries
      });
    } catch (e) {
      set((state) => ({
        sending: false,
        streamingMessageId: null,
        toolActivity: [],
        error: errorMessage(e, "Failed to send message"),
        retryAfterMessageId: optimisticUserId,
        activeConversation: state.activeConversation
      }));
    }
  },

  editMessage: async (messageId, content) => {
    const { activeConversationId, activeConversation, sending } = get();
    if (!activeConversationId || !activeConversation || sending) return;

    const messageIdx = activeConversation.messages.findIndex((m) => m.id === messageId);
    if (messageIdx < 0) return;

    set({
      sending: true,
      streamingMessageId: null,
      toolActivity: [],
      error: null,
      retryAfterMessageId: null,
      editingMessageId: null,
      activeConversation: {
        ...activeConversation,
        messages: activeConversation.messages
          .map((m, idx) => (idx === messageIdx ? { ...m, content } : m))
          .slice(0, messageIdx + 1)
      }
    });

    try {
      const result = await chatApi.apiEditMessage(activeConversationId, messageId, content);
      const summaries = await fetchSummariesForPanel(get().sidebarPanel);
      set({
        activeConversation: result.conversation,
        sending: false,
        streamingMessageId: null,
        toolActivity: [],
        retryAfterMessageId: null,
        summaries
      });
    } catch (e) {
      set({
        sending: false,
        streamingMessageId: null,
        toolActivity: [],
        error: errorMessage(e, "Failed to edit message"),
        retryAfterMessageId: messageId
      });
    }
  },

  retryMessage: async (messageId) => {
    const { activeConversationId, sending } = get();
    if (!activeConversationId || sending) return;

    set({
      sending: true,
      streamingMessageId: null,
      toolActivity: [],
      error: null,
      retryAfterMessageId: null
    });

    try {
      const result = await chatApi.apiRetryMessage(activeConversationId, messageId);
      const summaries = await fetchSummariesForPanel(get().sidebarPanel);
      set({
        activeConversation: result.conversation,
        sending: false,
        streamingMessageId: null,
        toolActivity: [],
        retryAfterMessageId: null,
        summaries
      });
    } catch (e) {
      const conv = get().activeConversation;
      let retryId = messageId ?? null;
      if (!retryId && conv) {
        for (let i = conv.messages.length - 1; i >= 0; i -= 1) {
          if (conv.messages[i].role === "user") {
            retryId = conv.messages[i].id;
            break;
          }
        }
      }
      set({
        sending: false,
        streamingMessageId: null,
        toolActivity: [],
        error: errorMessage(e, "Failed to retry"),
        retryAfterMessageId: retryId
      });
    }
  },

  regenerateLastResponse: async (createBranch = false) => {
    const { activeConversationId, sending } = get();
    if (!activeConversationId || sending) return;

    set({
      sending: true,
      streamingMessageId: null,
      toolActivity: [],
      error: null,
      retryAfterMessageId: null,
      editingMessageId: null,
      activeConversation: (() => {
        const conv = get().activeConversation;
        if (!conv || createBranch) return conv;
        let lastUserIdx = -1;
        for (let i = conv.messages.length - 1; i >= 0; i -= 1) {
          if (conv.messages[i].role === "user") {
            lastUserIdx = i;
            break;
          }
        }
        if (lastUserIdx < 0) return conv;
        return {
          ...conv,
          messages: conv.messages.slice(0, lastUserIdx + 1)
        };
      })()
    });

    try {
      const result = await chatApi.apiRegenerateLastResponse(
        activeConversationId,
        createBranch
      );
      const summaries = await fetchSummariesForPanel(get().sidebarPanel);
      set({
        activeConversation: result.conversation,
        sending: false,
        streamingMessageId: null,
        toolActivity: [],
        retryAfterMessageId: null,
        summaries
      });
    } catch (e) {
      const conv = get().activeConversation;
      let retryId: string | null = null;
      if (conv) {
        for (let i = conv.messages.length - 1; i >= 0; i -= 1) {
          if (conv.messages[i].role === "user") {
            retryId = conv.messages[i].id;
            break;
          }
        }
      }
      set({
        sending: false,
        streamingMessageId: null,
        toolActivity: [],
        error: errorMessage(e, "Failed to regenerate response"),
        retryAfterMessageId: retryId
      });
    }
  },

  forkConversation: async (messageId) => {
    const { activeConversationId } = get();
    if (!activeConversationId) return;
    try {
      const forked = await chatApi.apiForkConversation(activeConversationId, messageId);
      const summaries = await fetchSummariesForPanel(get().sidebarPanel);
      set({
        activeConversationId: forked.id,
        activeConversation: forked,
        summaries,
        error: null
      });
    } catch (e) {
      set({ error: errorMessage(e, "Failed to fork conversation") });
    }
  },

  selectBranch: async (parentId, assistantId) => {
    const { activeConversationId, activeConversation } = get();
    if (!activeConversationId || !activeConversation) return;
    const branchPicks = {
      ...(activeConversation.branchPicks ?? {}),
      [parentId]: assistantId
    };
    try {
      const updated = await chatApi.apiPatchConversation(activeConversationId, { branchPicks });
      set({ activeConversation: updated });
    } catch (e) {
      set({ error: errorMessage(e, "Failed to switch branch") });
    }
  },

  stopGeneration: async () => {
    const { activeConversationId, sending } = get();
    if (!activeConversationId || !sending) return;

    try {
      await chatApi.apiCancelGeneration(activeConversationId);
    } catch (e) {
      set({
        error: errorMessage(e, "Failed to stop generation")
      });
    }
  },

  exportActiveConversation: async (format) => {
    const { activeConversationId, activeConversation } = get();
    if (!activeConversationId || !activeConversation) return;

    set({ exporting: true, error: null });
    try {
      const content = await chatApi.apiExportConversation(activeConversationId, format);
      const filename = conversationExportFilename(activeConversation.title, format);
      const mimeType =
        format === "json"
          ? "application/json"
          : format === "html"
            ? "text/html"
            : "text/markdown";
      downloadTextFile(filename, content, mimeType);
      set({ exporting: false });
      toast(`Exported ${format.toUpperCase()}`);
    } catch (e) {
      set({
        exporting: false,
        error: errorMessage(e, "Failed to export conversation")
      });
    }
  }
}));
