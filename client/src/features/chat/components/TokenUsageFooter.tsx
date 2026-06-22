import { useEffect, useState } from "react";
import { useChatStore } from "../store/chatStore";
import { contextLimitForModel, estimateConversationTokens } from "../lib/modelUtils";
import { useSettingsStore } from "../../settings/store/settingsStore";
import * as pricingApi from "../../settings/services/pricingApi";

export function TokenUsageFooter() {
  const lastUsage = useChatStore((s) => s.lastUsage);
  const activeConversation = useChatStore((s) => s.activeConversation);
  const settings = useSettingsStore((s) => s.settings);
  const modelInfos = useSettingsStore((s) => s.modelInfos);
  const [prices, setPrices] = useState<Record<string, pricingApi.ModelPrice>>({});

  useEffect(() => {
    void pricingApi.apiGetModelPrices().then(setPrices).catch(() => setPrices({}));
  }, []);

  const modelId =
    activeConversation?.lastModel?.trim() || settings?.aiModel || "gpt-4o-mini";
  const contextLimit = contextLimitForModel(modelId, modelInfos);
  const estimatedInput = activeConversation
    ? estimateConversationTokens(activeConversation.messages)
    : 0;
  const contextPct = Math.min(100, Math.round((estimatedInput / contextLimit) * 100));
  const activeInfo = modelInfos.find((m) => m.id === modelId);
  const estimatedCost =
    lastUsage &&
    pricingApi.estimateCost(
      prices,
      modelId,
      lastUsage.promptTokens,
      lastUsage.completionTokens
    );

  if (!lastUsage && estimatedInput === 0) {
    return null;
  }

  return (
    <div className="token-usage-footer" aria-live="polite">
      {lastUsage ? (
        <span className="token-usage-stats">
          Tokens — in: {lastUsage.promptTokens.toLocaleString()} · out:{" "}
          {lastUsage.completionTokens.toLocaleString()} · total:{" "}
          {lastUsage.totalTokens.toLocaleString()}
          {estimatedCost != null ? ` · ~$${estimatedCost.toFixed(4)}` : ""}
        </span>
      ) : (
        <span className="token-usage-stats token-usage-stats--muted">
          Send a message to see token usage
        </span>
      )}
      {activeInfo ? (
        <span className="token-model-limits">
          {modelId}: {Math.round(contextLimit / 1000)}K ctx ·{" "}
          {Math.round(activeInfo.maxOutputTokens / 1000)}K max out
        </span>
      ) : null}
      <div
        className="token-context-bar"
        title={`~${estimatedInput.toLocaleString()} / ${contextLimit.toLocaleString()} tokens (estimate)`}
      >
        <div
          className="token-context-bar-fill"
          style={{ width: `${contextPct}%` }}
          role="progressbar"
          aria-valuenow={contextPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Estimated context usage"
        />
        <span className="token-context-label">~{contextPct}% context</span>
      </div>
    </div>
  );
}
