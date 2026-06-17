import { type FormEvent, useEffect, useState } from "react";
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
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onClose: () => void;
};

export function SettingsPanel({ open, theme, onThemeChange, onClose }: SettingsPanelProps) {
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

  const [form, setForm] = useState<SettingsForm | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (open) {
      void loadSettings();
      setSavedNotice(false);
    }
  }, [open, loadSettings]);

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

  const maxImageMb = settings
    ? (settings.maxImageBytes / (1024 * 1024)).toFixed(0)
    : "5";

  return (
    <div className="settings-overlay" role="presentation" onClick={onClose}>
      <div
        className="settings-dialog"
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

        {loading || !form ? (
          <div className="settings-loading">Loading settings…</div>
        ) : (
          <form className="settings-form" onSubmit={(e) => void handleSubmit(e)}>
            <section className="settings-section">
              <h3>Appearance</h3>
              <label className="settings-field">
                Theme
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
            </section>

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
                    placeholder="sk-…"
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
              <div className="settings-field-row-inline settings-model-row">
                <label className="settings-field settings-field-grow">
                  Default model
                  <input
                    type="text"
                    list="chatnest-model-options"
                    value={form.aiModel}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, aiModel: e.target.value } : f))
                    }
                    placeholder="gpt-4o-mini"
                    required
                  />
                  <datalist id="chatnest-model-options">
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
                  {modelsLoading ? "Loading…" : "Refresh models"}
                </button>
              </div>
              <label className="settings-field">
                Image model (optional)
                <input
                  type="text"
                  list="chatnest-model-options"
                  value={form.aiImageModel}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, aiImageModel: e.target.value } : f))
                  }
                  placeholder="gpt-4o (uses default model when empty)"
                />
              </label>
              <p className="settings-hint">
                Used for messages with image attachments and the analyze_image tool. Leave empty to
                use the default model.
              </p>
              <label className="settings-field">
                Audio model (optional)
                <input
                  type="text"
                  list="chatnest-model-options"
                  value={form.aiAudioModel}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, aiAudioModel: e.target.value } : f))
                  }
                  placeholder="whisper-1 (uses whisper-1 when empty)"
                />
              </label>
              <p className="settings-hint">
                Used by the analyze_audio tool for transcription via /audio/transcriptions.
              </p>
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
              <h3>Defaults</h3>
              <label className="settings-field">
                Default system prompt
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
              <p className="settings-hint">
                Used for new conversations when no prompt preset supplies a system message.
              </p>
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
              <p className="settings-hint">
                Attachments: up to {settings?.maxImagesPerMessage ?? 4} files — images & audio{" "}
                {maxImageMb}MB each, text/PDF up to 512KB/5MB (JPEG, PNG, WebP, GIF, MP3, WAV, PDF,
                TXT, MD, CSV, JSON).
              </p>
              {settings ? (
                <p className="settings-hint settings-path">
                  Config file: <code>{settings.configDir}\.env</code>
                </p>
              ) : null}
            </section>

            <footer className="settings-footer">
              <button type="button" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn-primary settings-save" disabled={saving}>
                {saving ? "Saving…" : "Save settings"}
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
}
