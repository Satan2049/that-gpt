import { invoke } from "../../../shared/lib/tauriInvoke";
import type { AppSettings, UpdateSettingsInput } from "../types/settings.types";
import type { ModelsListResult } from "../types/models.types";

export type ConnectionTestResult = {
  ok: boolean;
  message: string;
  modelCount?: number;
};

export type { ModelInfo, ModelsListResult, TokenUsage } from "../types/models.types";

export async function apiGetSettings(): Promise<AppSettings> {
  return invoke<AppSettings>("get_settings");
}

export async function apiUpdateSettings(input: UpdateSettingsInput): Promise<AppSettings> {
  return invoke<AppSettings>("update_settings", { body: input });
}

export async function apiListModels(): Promise<ModelsListResult> {
  return invoke<ModelsListResult>("list_models");
}

export async function apiTestConnection(): Promise<ConnectionTestResult> {
  return invoke<ConnectionTestResult>("test_api_connection");
}
