import { useEffect } from "react";
import { useSettingsStore } from "../features/settings/store/settingsStore";

export function ModelSelector() {
  const settings = useSettingsStore((s) => s.settings);
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const model = settings?.aiModel ?? "gpt-4o-mini";

  return (
    <div className="model-selector">
      <button type="button" className="model-selector-btn" disabled title="Full model picker coming in Phase 3">
        <span className="model-selector-name">ThatGPT</span>
        <span className="model-selector-model">{model}</span>
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
    </div>
  );
}
