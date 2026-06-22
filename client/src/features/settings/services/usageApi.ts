import { invoke } from "../../../shared/lib/tauriInvoke";

export type UsageDaySummary = {
  date: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestCount: number;
};

export async function apiGetUsageAnalytics(days = 30): Promise<UsageDaySummary[]> {
  return invoke<UsageDaySummary[]>("get_usage_analytics", { days });
}
