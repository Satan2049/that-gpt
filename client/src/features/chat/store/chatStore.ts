import { create } from "zustand";
import type { Conversation, ConversationSummary } from "../types/chat.types";
import * as chatApi from "../services/chatApi";

type ChatState = {
  summaries: ConversationSummary[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  loadingList: boolean;
  loadingConversation: boolean;
  sending: boolean;
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
  clearError: () => void;
};

export const useChatStore = create<ChatState>((set, get) => ({
  summaries: [],
  activeConversationId: null,
  activeConversation: null,
  loadingList: false,
  loadingConversation: false,
  sending: false,
  error: null,

  clearError: () => set({ error: null }),

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
        error: e instanceof Error ? e.message : "Failed to load conversations"
      });
    }
  },

  selectConversation: async (id: string) => {
    set({
      loadingConversation: true,
      error: null,
      activeConversationId: id
    });
    try {
      const conversation = await chatApi.apiGetConversation(id);
      set({ activeConversation: conversation, loadingConversation: false });
    } catch (err) {
      set({
        loadingConversation: false,
        error: err instanceof Error ? err.message : "Failed to load conversation"
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
        activeConversation: conversation
      }));
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Failed to create conversation"
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
          set({ activeConversationId: null, activeConversation: null });
        }
      }
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Failed to delete conversation"
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
        error: e instanceof Error ? e.message : "Failed to update conversation"
      });
    }
  },

  sendMessage: async (text, images) => {
    const trimmed = text.trim();
    const { activeConversationId } = get();
    if ((!trimmed && !(images?.length ?? 0)) || !activeConversationId) return;

    set({ sending: true, error: null });
    try {
      const result = await chatApi.apiSendMessage(activeConversationId, trimmed, {
        ...(images?.length ? { images } : {})
      });
      const summaries = await chatApi.apiListConversations();
      set({
        activeConversation: result.conversation,
        sending: false,
        summaries
      });
    } catch (e) {
      set({
        sending: false,
        error: e instanceof Error ? e.message : "Failed to send message"
      });
    }
  }
}));
