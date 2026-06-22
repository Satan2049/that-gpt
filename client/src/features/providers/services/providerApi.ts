import { invoke } from "../../../shared/lib/tauriInvoke";
import type { ConnectionTestResult } from "../../settings/services/settingsApi";
import type { ProviderStore, UpsertProviderInput } from "../types/provider.types";

export async function apiListProviders(): Promise<ProviderStore> {
  return invoke<ProviderStore>("list_providers");
}

export async function apiUpsertProvider(body: UpsertProviderInput): Promise<ProviderStore> {
  return invoke<ProviderStore>("upsert_provider", { body });
}

export async function apiDeleteProvider(id: string): Promise<ProviderStore> {
  return invoke<ProviderStore>("delete_provider", { id });
}

export async function apiSetActiveProvider(id: string): Promise<ProviderStore> {
  return invoke<ProviderStore>("set_active_provider", { body: { id } });
}

export async function apiTestProvider(body: UpsertProviderInput): Promise<ConnectionTestResult> {
  return invoke<ConnectionTestResult>("test_provider", { body });
}
