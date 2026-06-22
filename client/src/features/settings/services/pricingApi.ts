import { invoke } from "../../../shared/lib/tauriInvoke";

export type ModelPrice = {
  inputPerMillion: number;
  outputPerMillion: number;
};

export type UpdateCheckResult = {
  updateAvailable: boolean;
  latestVersion?: string;
  releaseUrl?: string;
  message: string;
};

export async function apiGetModelPrices(): Promise<Record<string, ModelPrice>> {
  return invoke<Record<string, ModelPrice>>("get_model_prices");
}

export async function apiSaveModelPrices(prices: Record<string, ModelPrice>): Promise<void> {
  await invoke("save_model_prices", { prices });
}

export async function apiCheckForUpdates(): Promise<UpdateCheckResult> {
  return invoke<UpdateCheckResult>("check_for_updates");
}

export function estimateCost(
  prices: Record<string, ModelPrice>,
  model: string,
  promptTokens: number,
  completionTokens: number
): number | null {
  const direct = prices[model];
  const price =
    direct ??
    Object.entries(prices).find(([key]) => model.includes(key))?.[1];
  if (!price) return null;
  return (
    (promptTokens / 1_000_000) * price.inputPerMillion +
    (completionTokens / 1_000_000) * price.outputPerMillion
  );
}
