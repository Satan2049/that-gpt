import { errorMessage } from "../../../shared/lib/errorMessage";
import { create } from "zustand";
import type { AppSettings, UpdateSettingsInput } from "../types/settings.types";
import type { ModelInfo } from "../types/models.types";
import * as settingsApi from "../services/settingsApi";
import type { ConnectionTestResult } from "../services/settingsApi";

type SettingsState = {
  settings: AppSettings | null;
  models: string[];
  modelInfos: ModelInfo[];
  loading: boolean;
  saving: boolean;
  modelsLoading: boolean;
  testingConnection: boolean;
  connectionTest: ConnectionTestResult | null;
  error: string | null;
  loadSettings: () => Promise<void>;
  saveSettings: (input: UpdateSettingsInput) => Promise<boolean>;
  fetchModels: () => Promise<void>;
  testConnection: () => Promise<void>;
  clearError: () => void;
  clearConnectionTest: () => void;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  models: [],
  modelInfos: [],
  loading: false,
  saving: false,
  modelsLoading: false,
  testingConnection: false,
  connectionTest: null,
  error: null,

  clearError: () => set({ error: null }),
  clearConnectionTest: () => set({ connectionTest: null }),

  loadSettings: async () => {
    set({ loading: true, error: null });
    try {
      const settings = await settingsApi.apiGetSettings();
      set({ settings, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: errorMessage(e, "Failed to load settings")
      });
    }
  },

  saveSettings: async (input) => {
    set({ saving: true, error: null });
    try {
      const settings = await settingsApi.apiUpdateSettings(input);
      set({ settings, saving: false });
      return true;
    } catch (e) {
      set({
        saving: false,
        error: errorMessage(e, "Failed to save settings")
      });
      return false;
    }
  },

  fetchModels: async () => {
    set({ modelsLoading: true, error: null });
    try {
      const result = await settingsApi.apiListModels();
      set({ models: result.models, modelInfos: result.modelInfos ?? [], modelsLoading: false });
    } catch (e) {
      set({
        modelsLoading: false,
        error: errorMessage(e, "Failed to load models")
      });
    }
  },

  testConnection: async () => {
    set({ testingConnection: true, connectionTest: null, error: null });
    try {
      const connectionTest = await settingsApi.apiTestConnection();
      set({ connectionTest, testingConnection: false });
      if (connectionTest.ok && connectionTest.modelCount) {
        await get().fetchModels();
      }
    } catch (e) {
      set({
        testingConnection: false,
        error: errorMessage(e, "Connection test failed")
      });
    }
  }
}));

export function useDefaultModel(): string {
  return useSettingsStore((s) => s.settings?.aiModel ?? "gpt-4o-mini");
}

export function useImageLimits(): { maxCount: number; maxBytes: number } {
  const settings = useSettingsStore((s) => s.settings);
  return {
    maxCount: settings?.maxImagesPerMessage ?? 4,
    maxBytes: settings?.maxImageBytes ?? 5 * 1024 * 1024
  };
}
