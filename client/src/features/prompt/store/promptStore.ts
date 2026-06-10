import { errorMessage } from "../../../shared/lib/errorMessage";
import { create } from "zustand";
import type { PromptPreset } from "../types/prompt.types";
import * as promptApi from "../services/promptApi";

type PromptState = {
  presets: PromptPreset[];
  loading: boolean;
  error: string | null;
  loadPrompts: () => Promise<void>;
  createPreset: (input: {
    name: string;
    systemPrompt: string;
    temperature?: number;
    maxTokens?: number;
    model?: string;
  }) => Promise<boolean>;
  updatePreset: (
    id: string,
    input: {
      name: string;
      systemPrompt: string;
      temperature: number;
      maxTokens: number;
      model: string;
    }
  ) => Promise<boolean>;
  deletePreset: (id: string) => Promise<boolean>;
  clearError: () => void;
};

export const usePromptStore = create<PromptState>((set, get) => ({
  presets: [],
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  loadPrompts: async () => {
    set({ loading: true, error: null });
    try {
      const presets = await promptApi.apiListPrompts();
      set({ presets, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: errorMessage(e, "Failed to load presets")
      });
    }
  },

  createPreset: async (input) => {
    set({ error: null });
    try {
      await promptApi.apiCreatePreset(input);
      await get().loadPrompts();
      return true;
    } catch (e) {
      set({
        error: errorMessage(e, "Failed to create preset")
      });
      return false;
    }
  },

  updatePreset: async (id, input) => {
    set({ error: null });
    try {
      await promptApi.apiUpdatePreset(id, input);
      await get().loadPrompts();
      return true;
    } catch (e) {
      set({
        error: errorMessage(e, "Failed to update preset")
      });
      return false;
    }
  },

  deletePreset: async (id) => {
    set({ error: null });
    try {
      await promptApi.apiDeletePreset(id);
      await get().loadPrompts();
      return true;
    } catch (e) {
      set({
        error: errorMessage(e, "Failed to delete preset")
      });
      return false;
    }
  }
}));
