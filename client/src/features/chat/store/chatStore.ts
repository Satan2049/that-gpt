import { errorMessage } from "../../../shared/lib/errorMessage";
import { conversationExportFilename, downloadTextFile } from "../../../shared/lib/downloadTextFile";
import { create } from "zustand";
import type { Conversation, ConversationSummary, PendingAttachmentPayload } from "../types/chat.types";
import * as chatApi from "../services/chatApi";

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

type ChatState = {
  summaries: ConversationSummary[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  loadingList: boolean;
  loadingConversation: boolean;
  sending: boolean;
  streamingMessageId: string | null;
  toolActivity: ToolActivityItem[];
  exporting: boolean;
  error: string | null;
  searchQuery: string;
  loadConversations: () => Promise<void>;
  searchConversations: (query: string) => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  createConversation: () => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  patchConversation: (patch: {
    title?: string;
    promptPresetId?: string | null;
  }) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  sendMessage: (text: string, attachments?: PendingAttachmentPayload[]) => Promise<void>;
  regenerateLastResponse: () => Promise<void>;
  stopGeneration: () => Promise<void>;
  exportActiveConversation: (format: "json" | "markdown") => Promise<void>;
  onStreamStart: (payload: StreamStartPayload) => void;
  onStreamChunk: (payload: StreamChunkPayload) => void;
  onStreamCancelled: (payload: StreamCancelledPayload) => void;
  onToolCall: (payload: ToolCallPayload) => void;
  onToolResult: (payload: ToolResultPayload) => void;
  clearError: () => void;
};

export const useChatStore = create<ChatState>((set, get) => ({
  summaries: [],
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

  clearError: () => set({ error: null }),

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

  loadConversations: async () => {
    set({ loadingList: true, error: null });
    try {
      const summaries = await chatApi.apiListConversations();
      set({ summaries, loadingList: false, searchQuery: "" });
      const { activeConversationId } = get();
      if (!activeConversationId && summaries.length > 0) {
        await get().selectConversation(summaries[0].id);
      }
    } catch (e) {
      set({
        loadingList: false,
        error: errorMessage(e, "Failed to load conversations")
      });
    }
  },

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
      streamingMessageId: null
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

  createConversation: async () => {
    set({ error: null });
    try {
      const conversation = await chatApi.apiCreateConversation();
      set((state) => ({
        summaries: [
          {
            id: conversation.id,
            title: conversation.title,
            updatedAt: conversation.updatedAt
          },
          ...state.summaries
        ],
        activeConversationId: conversation.id,
        activeConversation: conversation,
        streamingMessageId: null
      }));
    } catch (e) {
      set({
        error: errorMessage(e, "Failed to create conversation")
      });
    }
  },

  deleteConversation: async (id: string) => {
    set({ error: null });
    try {
      await chatApi.apiDeleteConversation(id);
      const summaries = await chatApi.apiListConversations();
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
        : await chatApi.apiListConversations();
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
        : await chatApi.apiListConversations();
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
      activeConversation: {
        ...activeConversation,
        messages: [...activeConversation.messages, optimisticUser]
      }
    });

    try {
      const result = await chatApi.apiSendMessage(activeConversationId, trimmed, {
        ...(attachments?.length ? { attachments } : {})
      });
      const summaries = await chatApi.apiListConversations();
      set({
        activeConversation: result.conversation,
        sending: false,
        streamingMessageId: null,
        toolActivity: [],
        summaries
      });
    } catch (e) {
      set((state) => ({
        sending: false,
        streamingMessageId: null,
        toolActivity: [],
        error: errorMessage(e, "Failed to send message"),
        activeConversation: state.activeConversation
          ? {
              ...state.activeConversation,
              messages: state.activeConversation.messages.filter(
                (m) => m.id !== optimisticUserId
              )
            }
          : null
      }));
    }
  },

  regenerateLastResponse: async () => {
    const { activeConversationId, sending } = get();
    if (!activeConversationId || sending) return;

    set({
      sending: true,
      streamingMessageId: null,
      toolActivity: [],
      error: null,
      activeConversation: (() => {
        const conv = get().activeConversation;
        if (!conv) return conv;
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
      const result = await chatApi.apiRegenerateLastResponse(activeConversationId);
      const summaries = await chatApi.apiListConversations();
      set({
        activeConversation: result.conversation,
        sending: false,
        streamingMessageId: null,
        toolActivity: [],
        summaries
      });
    } catch (e) {
      set({
        sending: false,
        streamingMessageId: null,
        toolActivity: [],
        error: errorMessage(e, "Failed to regenerate response")
      });
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
      const mimeType = format === "json" ? "application/json" : "text/markdown";
      downloadTextFile(filename, content, mimeType);
      set({ exporting: false });
    } catch (e) {
      set({
        exporting: false,
        error: errorMessage(e, "Failed to export conversation")
      });
    }
  }
}));
