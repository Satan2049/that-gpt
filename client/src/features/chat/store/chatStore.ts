import { errorMessage } from "../../../shared/lib/errorMessage";
import { conversationExportFilename, downloadTextFile } from "../../../shared/lib/downloadTextFile";
import { create } from "zustand";
import type { Conversation, ConversationSummary } from "../types/chat.types";
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

type ChatState = {
  summaries: ConversationSummary[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  loadingList: boolean;
  loadingConversation: boolean;
  sending: boolean;
  streamingMessageId: string | null;
  exporting: boolean;
  error: string | null;
  loadConversations: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  createConversation: () => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  patchConversation: (patch: {
    title?: string;
    promptPresetId?: string | null;
  }) => Promise<void>;
  sendMessage: (
    text: string,
    images?: Array<{ mimeType: string; base64: string }>
  ) => Promise<void>;
  exportActiveConversation: (format: "json" | "markdown") => Promise<void>;
  onStreamStart: (payload: StreamStartPayload) => void;
  onStreamChunk: (payload: StreamChunkPayload) => void;
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

  loadConversations: async () => {
    set({ loadingList: true, error: null });
    try {
      const summaries = await chatApi.apiListConversations();
      set({ summaries, loadingList: false });
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
      const summaries = await chatApi.apiListConversations();
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

  sendMessage: async (text, images) => {
    const trimmed = text.trim();
    const { activeConversationId, activeConversation } = get();
    if ((!trimmed && !(images?.length ?? 0)) || !activeConversationId || !activeConversation) {
      return;
    }

    const optimisticUserId = crypto.randomUUID();
    const optimisticUser = {
      id: optimisticUserId,
      conversationId: activeConversationId,
      role: "user" as const,
      content: trimmed,
      createdAt: new Date().toISOString(),
      ...(images?.length
        ? {
            images: images.map((img) => ({
              mimeType: img.mimeType as "image/jpeg" | "image/png" | "image/webp",
              base64: img.base64
            }))
          }
        : {})
    };

    set({
      sending: true,
      streamingMessageId: null,
      error: null,
      activeConversation: {
        ...activeConversation,
        messages: [...activeConversation.messages, optimisticUser]
      }
    });

    try {
      const result = await chatApi.apiSendMessage(activeConversationId, trimmed, {
        ...(images?.length ? { images } : {})
      });
      const summaries = await chatApi.apiListConversations();
      set({
        activeConversation: result.conversation,
        sending: false,
        streamingMessageId: null,
        summaries
      });
    } catch (e) {
      set((state) => ({
        sending: false,
        streamingMessageId: null,
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
