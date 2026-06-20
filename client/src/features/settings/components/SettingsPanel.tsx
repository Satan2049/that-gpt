import { type FormEvent, useEffect, useState } from "react";
import { PromptPresetPanel } from "../../prompt/components/PromptPresetPanel";
import type { Theme } from "../../../shared/lib/theme";
import { applyTheme } from "../../../shared/lib/theme";
import type { AppSettings } from "../types/settings.types";
import { useSettingsStore } from "../store/settingsStore";

type SettingsForm = {
  aiApiKey: string;
  aiBaseUrl: string;
  aiModel: string;
  aiImageModel: string;
  aiAudioModel: string;
  aiDefaultSystemPrompt: string;
  aiRequestTimeoutMs: string;
  aiMaxRetries: string;
  theme: Theme;
};

type SettingsTab =
  | "general"
  | "personalization"
  | "providers"
  | "data"
  | "storage"
  | "keyboard";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "personalization", label: "Personalization" },
  { id: "providers", label: "Providers & Models" },
  { id: "data", label: "Data controls" },
  { id: "storage", label: "Storage" },
  { id: "keyboard", label: "Keyboard" }
];

const PERSONALITY_PRESETS = [
  { id: "helpful", label: "Actually Helpful", prompt: "You are a helpful assistant." },
  { id: "corporate", label: "Corporate Drone", prompt: "You are a painfully corporate assistant who loves synergy." },
  { id: "unhinged", label: "Unhinged Intern", prompt: "You are an over-caffeinated intern who answers correctly but chaotically." },
  { id: "passive", label: "Passive-Aggressive Helper", prompt: "You help, but you make it clear you're disappointed they didn't Google it first." }
];

function toForm(settings: AppSettings, theme: Theme): SettingsForm {
  return {
    aiApiKey: settings.aiApiKey,
    aiBaseUrl: settings.aiBaseUrl,
    aiModel: settings.aiModel,
    aiImageModel: settings.aiImageModel,
    aiAudioModel: settings.aiAudioModel,
    aiDefaultSystemPrompt: settings.aiDefaultSystemPrompt,
    aiRequestTimeoutMs: String(settings.aiRequestTimeoutMs),
    aiMaxRetries: String(settings.aiMaxRetries),
    theme
  };
}

type SettingsPanelProps = {
  open: boolean;
  initialTab?: string;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onClose: () => void;
};

export function SettingsPanel({
  open,
  initialTab,
  theme,
  onThemeChange,
  onClose
}: SettingsPanelProps) {
  const settings = useSettingsStore((s) => s.settings);
  const loading = useSettingsStore((s) => s.loading);
  const saving = useSettingsStore((s) => s.saving);
  const error = useSettingsStore((s) => s.error);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const saveSettings = useSettingsStore((s) => s.saveSettings);
  const clearError = useSettingsStore((s) => s.clearError);
  const models = useSettingsStore((s) => s.models);
  const modelsLoading = useSettingsStore((s) => s.modelsLoading);
  const fetchModels = useSettingsStore((s) => s.fetchModels);
  const testConnection = useSettingsStore((s) => s.testConnection);
  const testingConnection = useSettingsStore((s) => s.testingConnection);
  const connectionTest = useSettingsStore((s) => s.connectionTest);
  const clearConnectionTest = useSettingsStore((s) => s.clearConnectionTest);

  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (open) {
      void loadSettings();
      setSavedNotice(false);
      if (initialTab && TABS.some((t) => t.id === initialTab)) {
        setActiveTab(initialTab as SettingsTab);
      }
    }
  }, [open, loadSettings, initialTab]);

  useEffect(() => {
    if (settings && open) {
      setForm(toForm(settings, theme));
    }
  }, [settings, open, theme]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;

    const aiRequestTimeoutMs = Number(form.aiRequestTimeoutMs);
    const aiMaxRetries = Number(form.aiMaxRetries);
    if (!Number.isFinite(aiRequestTimeoutMs) || !Number.isFinite(aiMaxRetries)) {
      return;
    }

    const ok = await saveSettings({
      aiApiKey: form.aiApiKey,
      aiBaseUrl: form.aiBaseUrl.trim(),
      aiModel: form.aiModel.trim(),
      aiImageModel: form.aiImageModel.trim(),
      aiAudioModel: form.aiAudioModel.trim(),
      aiDefaultSystemPrompt: form.aiDefaultSystemPrompt,
      aiRequestTimeoutMs: Math.round(aiRequestTimeoutMs),
      aiMaxRetries: Math.round(aiMaxRetries)
    });

    if (ok) {
      if (form.theme !== theme) {
        applyTheme(form.theme);
        onThemeChange(form.theme);
      }
      setSavedNotice(true);
    }
  };

  const maxImageMb = settings ? (settings.maxImageBytes / (1024 * 1024)).toFixed(0) : "5";
  const showSaveFooter = activeTab === "general" || activeTab === "providers" || activeTab === "personalization";

  return (
    <div className="settings-overlay" role="presentation" onClick={onClose}>
      <div
        className="settings-dialog settings-dialog--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="settings-header">
          <h2 id="settings-title">Settings</h2>
          <button type="button" className="settings-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {error ? (
          <div className="settings-banner-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={clearError}>
              Dismiss
            </button>
          </div>
        ) : null}

        {savedNotice ? (
          <div className="settings-banner-success" role="status">
            Settings saved.
          </div>
        ) : null}

        <div className="settings-layout">
          <nav className="settings-nav" aria-label="Settings sections">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? "settings-nav-item active" : "settings-nav-item"}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="settings-content">
            {loading || !form ? (
              <div className="settings-loading">Loading settings…</div>
            ) : (
              <form className="settings-form" onSubmit={(e) => void handleSubmit(e)}>
                {activeTab === "general" ? (
                  <section className="settings-section">
                    <h3>General</h3>
                    <label className="settings-field">
                      Appearance
                      <select
                        value={form.theme}
                        onChange={(e) =>
                          setForm((f) => (f ? { ...f, theme: e.target.value as Theme } : f))
                        }
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                      </select>
                    </label>
                    <p className="settings-hint">
                      ThatGPT runs locally on your machine. No cloud account required.
                    </p>
                  </section>
                ) : null}

                {activeTab === "personalization" ? (
                  <>
                    <section className="settings-section">
                      <h3>Personality</h3>
                      <p className="settings-hint">Pick a vibe. Your API key still does the heavy lifting.</p>
                      <div className="personality-grid">
                        {PERSONALITY_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            className={
                              form.aiDefaultSystemPrompt === preset.prompt
                                ? "personality-chip active"
                                : "personality-chip"
                            }
                            onClick={() =>
                              setForm((f) =>
                                f ? { ...f, aiDefaultSystemPrompt: preset.prompt } : f
                              )
                            }
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </section>
                    <section className="settings-section">
                      <h3>Default system prompt</h3>
                      <label className="settings-field">
                        Custom instructions
                        <textarea
                          value={form.aiDefaultSystemPrompt}
                          onChange={(e) =>
                            setForm((f) =>
                              f ? { ...f, aiDefaultSystemPrompt: e.target.value } : f
                            )
                          }
                          rows={4}
                        />
                      </label>
                    </section>
                    <section className="settings-section">
                      <h3>Prompt presets</h3>
                      <PromptPresetPanel />
                    </section>
                  </>
                ) : null}

                {activeTab === "providers" ? (
                  <>
                    <section className="settings-section">
                      <h3>API provider</h3>
                      <label className="settings-field">
                        API key
                        <div className="settings-field-row-inline">
                          <input
                            type={showApiKey ? "text" : "password"}
                            value={form.aiApiKey}
                            onChange={(e) =>
                              setForm((f) => (f ? { ...f, aiApiKey: e.target.value } : f))
                            }
                            placeholder="sk-… or local key"
                            autoComplete="off"
                          />
                          <button
                            type="button"
                            className="settings-inline-btn"
                            onClick={() => setShowApiKey((v) => !v)}
                          >
                            {showApiKey ? "Hide" : "Show"}
                          </button>
                        </div>
                      </label>
                      <label className="settings-field">
                        Base URL
                        <input
                          type="url"
                          value={form.aiBaseUrl}
                          onChange={(e) =>
                            setForm((f) => (f ? { ...f, aiBaseUrl: e.target.value } : f))
                          }
                          placeholder="https://api.openai.com/v1"
                          required
                        />
                      </label>
                      <p className="settings-hint">
                        Works with OpenAI-compatible APIs and local proxies. Ollama support coming in Phase 3.
                      </p>
                    </section>

                    <section className="settings-section">
                      <h3>Models</h3>
                      <div className="settings-field-row-inline settings-model-row">
                        <label className="settings-field settings-field-grow">
                          Default model
                          <input
                            type="text"
                            list="thatgpt-model-options"
                            value={form.aiModel}
                            onChange={(e) =>
                              setForm((f) => (f ? { ...f, aiModel: e.target.value } : f))
                            }
                            placeholder="gpt-4o-mini"
                            required
                          />
                          <datalist id="thatgpt-model-options">
                            {models.map((model) => (
                              <option key={model} value={model} />
                            ))}
                          </datalist>
                        </label>
                        <button
                          type="button"
                          className="settings-inline-btn"
                          disabled={modelsLoading}
                          onClick={() => void fetchModels()}
                        >
                          {modelsLoading ? "Loading…" : "Refresh"}
                        </button>
                      </div>
                      <label className="settings-field">
                        Image model (optional)
                        <input
                          type="text"
                          list="thatgpt-model-options"
                          value={form.aiImageModel}
                          onChange={(e) =>
                            setForm((f) => (f ? { ...f, aiImageModel: e.target.value } : f))
                          }
                          placeholder="Uses default when empty"
                        />
                      </label>
                      <label className="settings-field">
                        Audio model (optional)
                        <input
                          type="text"
                          list="thatgpt-model-options"
                          value={form.aiAudioModel}
                          onChange={(e) =>
                            setForm((f) => (f ? { ...f, aiAudioModel: e.target.value } : f))
                          }
                          placeholder="whisper-1"
                        />
                      </label>
                      <div className="settings-action-row">
                        <button
                          type="button"
                          className="settings-inline-btn"
                          disabled={testingConnection}
                          onClick={() => void testConnection()}
                        >
                          {testingConnection ? "Testing…" : "Test connection"}
                        </button>
                        {connectionTest ? (
                          <span
                            className={
                              connectionTest.ok ? "settings-test-ok" : "settings-test-fail"
                            }
                          >
                            {connectionTest.message}
                            {connectionTest.modelCount != null
                              ? ` (${connectionTest.modelCount} models)`
                              : ""}
                            <button
                              type="button"
                              className="settings-test-dismiss"
                              onClick={clearConnectionTest}
                              aria-label="Dismiss test result"
                            >
                              ×
                            </button>
                          </span>
                        ) : null}
                      </div>
                    </section>

                    <section className="settings-section">
                      <h3>Advanced</h3>
                      <div className="settings-field-row">
                        <label className="settings-field">
                          Request timeout (ms)
                          <input
                            type="number"
                            min={1000}
                            max={600000}
                            step={1000}
                            value={form.aiRequestTimeoutMs}
                            onChange={(e) =>
                              setForm((f) =>
                                f ? { ...f, aiRequestTimeoutMs: e.target.value } : f
                              )
                            }
                            required
                          />
                        </label>
                        <label className="settings-field">
                          Max retries
                          <input
                            type="number"
                            min={0}
                            max={10}
                            value={form.aiMaxRetries}
                            onChange={(e) =>
                              setForm((f) => (f ? { ...f, aiMaxRetries: e.target.value } : f))
                            }
                            required
                          />
                        </label>
                      </div>
                    </section>
                  </>
                ) : null}

                {activeTab === "data" ? (
                  <section className="settings-section">
                    <h3>Data controls</h3>
                    <p className="settings-hint">
                      Conversations are stored locally as JSON. Export chats from the header menu.
                      Clear-all and export-everything coming in a later phase.
                    </p>
                  </section>
                ) : null}

                {activeTab === "storage" ? (
                  <section className="settings-section">
                    <h3>Storage</h3>
                    <p className="settings-hint">
                      Attachments: up to {settings?.maxImagesPerMessage ?? 4} files — images &amp; audio{" "}
                      {maxImageMb}MB each, text/PDF up to 512KB/5MB.
                    </p>
                    {settings ? (
                      <p className="settings-hint settings-path">
                        Config: <code>{settings.configDir}\.env</code>
                        <br />
                        Data: <code>{settings.configDir}\data\</code>
                      </p>
                    ) : null}
                  </section>
                ) : null}

                {activeTab === "keyboard" ? (
                  <section className="settings-section">
                    <h3>Keyboard shortcuts</h3>
                    <table className="shortcuts-table">
                      <tbody>
                        <tr>
                          <td>Send message</td>
                          <td>
                            <kbd>Enter</kbd>
                          </td>
                        </tr>
                        <tr>
                          <td>New line</td>
                          <td>
                            <kbd>Shift</kbd> + <kbd>Enter</kbd>
                          </td>
                        </tr>
                        <tr>
                          <td>Search chats</td>
                          <td>
                            <kbd>Ctrl</kbd> + <kbd>K</kbd>
                          </td>
                        </tr>
                        <tr>
                          <td>New chat</td>
                          <td>
                            <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>O</kbd>
                          </td>
                        </tr>
                        <tr>
                          <td>Toggle sidebar</td>
                          <td>
                            Header menu button after collapse
                          </td>
                        </tr>
                        <tr>
                          <td>Close modal</td>
                          <td>
                            <kbd>Esc</kbd>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </section>
                ) : null}

                {showSaveFooter ? (
                  <footer className="settings-footer">
                    <button type="button" onClick={onClose} disabled={saving}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary settings-save" disabled={saving}>
                      {saving ? "Saving…" : "Save settings"}
                    </button>
                  </footer>
                ) : null}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
