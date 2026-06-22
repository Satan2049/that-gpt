import { errorMessage } from "../../../shared/lib/errorMessage";
import { create } from "zustand";
import type { ProviderStore, UpsertProviderInput } from "../types/provider.types";
import * as providerApi from "../services/providerApi";
import { useSettingsStore } from "../../settings/store/settingsStore";

type ProviderState = {
  store: ProviderStore | null;
  loading: boolean;
  saving: boolean;
  testing: boolean;
  error: string | null;
  loadProviders: () => Promise<void>;
  upsertProvider: (input: UpsertProviderInput) => Promise<boolean>;
  deleteProvider: (id: string) => Promise<boolean>;
  setActiveProvider: (id: string) => Promise<boolean>;
  testProvider: (input: UpsertProviderInput) => Promise<{ ok: boolean; message: string }>;
  clearError: () => void;
};

export const useProviderStore = create<ProviderState>((set, get) => ({
  store: null,
  loading: false,
  saving: false,
  testing: false,
  error: null,

  clearError: () => set({ error: null }),

  loadProviders: async () => {
    set({ loading: true, error: null });
    try {
      const store = await providerApi.apiListProviders();
      set({ store, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: errorMessage(e, "Failed to load providers")
      });
    }
  },

  upsertProvider: async (input) => {
    set({ saving: true, error: null });
    try {
      const store = await providerApi.apiUpsertProvider(input);
      set({ store, saving: false });
      await useSettingsStore.getState().loadSettings();
      return true;
    } catch (e) {
      set({
        saving: false,
        error: errorMessage(e, "Failed to save provider")
      });
      return false;
    }
  },

  deleteProvider: async (id) => {
    set({ saving: true, error: null });
    try {
      const store = await providerApi.apiDeleteProvider(id);
      set({ store, saving: false });
      await useSettingsStore.getState().loadSettings();
      return true;
    } catch (e) {
      set({
        saving: false,
        error: errorMessage(e, "Failed to delete provider")
      });
      return false;
    }
  },

  setActiveProvider: async (id) => {
    set({ saving: true, error: null });
    try {
      const store = await providerApi.apiSetActiveProvider(id);
      set({ store, saving: false });
      const settingsStore = useSettingsStore.getState();
      await settingsStore.loadSettings();
      await settingsStore.fetchModels();
      return true;
    } catch (e) {
      set({
        saving: false,
        error: errorMessage(e, "Failed to switch provider")
      });
      return false;
    }
  },

  testProvider: async (input) => {
    set({ testing: true, error: null });
    try {
      const result = await providerApi.apiTestProvider(input);
      set({ testing: false });
      return { ok: result.ok, message: result.message };
    } catch (e) {
      const message = errorMessage(e, "Connection test failed");
      set({ testing: false, error: message });
      return { ok: false, message };
    }
  }
}));

export function useActiveProvider() {
  const store = useProviderStore((s) => s.store);
  if (!store) return null;
  return store.providers.find((p) => p.id === store.activeId) ?? null;
}
