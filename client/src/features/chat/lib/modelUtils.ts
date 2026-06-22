import type { ModelInfo } from "../../settings/types/models.types";

export function formatTokenCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function estimateConversationTokens(
  messages: Array<{ content: string; role: string }>
): number {
  return messages.reduce((sum, m) => sum + estimateTokenCount(m.content) + 4, 0);
}

export function modelInfoForId(modelInfos: ModelInfo[], modelId: string): ModelInfo | undefined {
  return modelInfos.find((m) => m.id === modelId);
}

export function contextLimitForModel(modelId: string, modelInfos: ModelInfo[]): number {
  return modelInfoForId(modelInfos, modelId)?.contextWindow ?? 128_000;
}

export const OPEN_MODEL_SELECTOR_EVENT = "thatgpt:open-model-selector";

export function requestOpenModelSelector() {
  window.dispatchEvent(new CustomEvent(OPEN_MODEL_SELECTOR_EVENT));
}
