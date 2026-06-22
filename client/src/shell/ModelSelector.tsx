import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../features/chat/store/chatStore";
import { OPEN_MODEL_SELECTOR_EVENT, formatTokenCount, modelInfoForId } from "../features/chat/lib/modelUtils";
import { useActiveProvider } from "../features/providers/store/providerStore";
import type { ModelInfo } from "../features/settings/types/models.types";
import { useSettingsStore } from "../features/settings/store/settingsStore";

function CapabilityBadges({ info }: { info?: ModelInfo }) {
  if (!info) return null;
  const badges: Array<{ key: string; label: string; className: string }> = [];
  if (info.embedding) badges.push({ key: "e", label: "Embedding", className: "embedding" });
  if (info.audio) badges.push({ key: "a", label: "Audio", className: "audio" });
  if (info.vision) badges.push({ key: "v", label: "Vision", className: "vision" });
  if (info.imageGen) badges.push({ key: "g", label: "Image Gen", className: "image-gen" });
  if (info.reasoning) badges.push({ key: "r", label: "Reasoning", className: "reasoning" });
  if (info.tools) badges.push({ key: "t", label: "Tools", className: "tools" });

  return (
    <span className="model-cap-badges">
      {badges.map((b) => (
        <span key={b.key} className={`model-cap-badge model-cap-badge--${b.className}`} title={b.label}>
          {b.label}
        </span>
      ))}
    </span>
  );
}

function ModelLimits({ info }: { info?: ModelInfo }) {
  if (!info) return null;
  if (info.embedding) {
    return <span className="model-limits">Embedding model</span>;
  }
  if (info.imageGen) {
    return <span className="model-limits">Image generation</span>;
  }
  return (
    <span className="model-limits">
      {formatTokenCount(info.contextWindow)} ctx · {formatTokenCount(info.maxOutputTokens)} out
    </span>
  );
}

export function ModelSelector() {
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [tempValue, setTempValue] = useState("");
  const [maxTokensValue, setMaxTokensValue] = useState("");
  const [systemPromptValue, setSystemPromptValue] = useState("");

  const settings = useSettingsStore((s) => s.settings);
  const models = useSettingsStore((s) => s.models);
  const modelInfos = useSettingsStore((s) => s.modelInfos);
  const modelsLoading = useSettingsStore((s) => s.modelsLoading);
  const fetchModels = useSettingsStore((s) => s.fetchModels);
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  const activeProvider = useActiveProvider();
  const activeConversation = useChatStore((s) => s.activeConversation);
  const patchConversation = useChatStore((s) => s.patchConversation);

  const activeModel =
    activeConversation?.lastModel?.trim() || settings?.aiModel || "gpt-4o-mini";
  const activeInfo = modelInfoForId(modelInfos, activeModel);

  useEffect(() => {
    void loadSettings();
    void fetchModels();
  }, [loadSettings, fetchModels]);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_MODEL_SELECTOR_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_MODEL_SELECTOR_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setAdvancedOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open || !activeConversation) return;
    setTempValue(
      activeConversation.temperatureOverride != null
        ? String(activeConversation.temperatureOverride)
        : ""
    );
    setMaxTokensValue(
      activeConversation.maxTokensOverride != null
        ? String(activeConversation.maxTokensOverride)
        : ""
    );
    setSystemPromptValue(activeConversation.systemPromptOverride ?? "");
  }, [open, activeConversation]);

  const filteredModels = models.filter((m) =>
    m.toLowerCase().includes(filter.trim().toLowerCase())
  );

  const selectModel = async (modelId: string) => {
    if (!activeConversation) return;
    await patchConversation({ lastModel: modelId });
    setOpen(false);
  };

  const saveAdvanced = async () => {
    if (!activeConversation) return;
    const temp = tempValue.trim();
    const maxTok = maxTokensValue.trim();
    await patchConversation({
      temperatureOverride: temp ? Number(temp) : null,
      maxTokensOverride: maxTok ? Number(maxTok) : null,
      systemPromptOverride: systemPromptValue.trim() || null
    });
    setAdvancedOpen(false);
  };

  const providerLabel = activeProvider?.name ?? "ThatGPT";

  return (
    <div className="model-selector" ref={menuRef}>
      <button
        type="button"
        className="model-selector-btn"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="model-selector-name">{providerLabel}</span>
        <span className="model-selector-model">{activeModel}</span>
        {activeInfo ? <ModelLimits info={activeInfo} /> : null}
        <svg
          className="model-selector-chevron"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div className="model-selector-menu" role="listbox" aria-label="Models">
          <div className="model-selector-menu-header">
            <input
              type="search"
              className="model-selector-search"
              placeholder="Search models…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              autoFocus
            />
            <button
              type="button"
              className="model-selector-refresh"
              disabled={modelsLoading}
              onClick={() => void fetchModels()}
            >
              {modelsLoading ? "…" : "↻"}
            </button>
          </div>

          <ul className="model-selector-list">
            {filteredModels.length === 0 ? (
              <li className="model-selector-empty">
                {modelsLoading ? "Loading models…" : "No models found"}
              </li>
            ) : (
              filteredModels.map((modelId) => {
                const info = modelInfoForId(modelInfos, modelId);
                const selected = modelId === activeModel;
                return (
                  <li key={modelId}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={selected ? "model-selector-item active" : "model-selector-item"}
                      onClick={() => void selectModel(modelId)}
                    >
                      <span className="model-selector-item-main">
                        <span className="model-selector-item-id">{modelId}</span>
                        <ModelLimits info={info} />
                      </span>
                      <CapabilityBadges info={info} />
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          {activeConversation ? (
            <div className="model-selector-advanced">
              <button
                type="button"
                className="model-selector-advanced-toggle"
                onClick={() => setAdvancedOpen((v) => !v)}
              >
                Advanced {advancedOpen ? "▴" : "▾"}
              </button>
              {advancedOpen ? (
                <div className="model-selector-advanced-panel">
                  <label className="settings-field">
                    Temperature override
                    <input
                      type="number"
                      min={0}
                      max={2}
                      step={0.1}
                      placeholder="Preset default"
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                    />
                  </label>
                  <label className="settings-field">
                    Max output tokens override
                    <input
                      type="number"
                      min={1}
                      max={128000}
                      placeholder={activeInfo ? String(activeInfo.maxOutputTokens) : "Preset default"}
                      value={maxTokensValue}
                      onChange={(e) => setMaxTokensValue(e.target.value)}
                    />
                  </label>
                  <label className="settings-field">
                    System prompt override
                    <textarea
                      rows={3}
                      placeholder="Uses preset or global default when empty"
                      value={systemPromptValue}
                      onChange={(e) => setSystemPromptValue(e.target.value)}
                    />
                  </label>
                  <button type="button" className="btn-primary" onClick={() => void saveAdvanced()}>
                    Apply overrides
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
