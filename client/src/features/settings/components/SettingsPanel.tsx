import { type FormEvent, useEffect, useState } from "react";
import { PromptPresetPanel } from "../../prompt/components/PromptPresetPanel";
import { ProvidersPanel } from "../../providers/components/ProvidersPanel";
import * as libraryApi from "../../library/services/libraryApi";
import * as templateApi from "../../templates/services/templateApi";
import * as usageApi from "../services/usageApi";
import * as pricingApi from "../services/pricingApi";
import type { Theme } from "../../../shared/lib/theme";
import { applyTheme } from "../../../shared/lib/theme";
import type { AppSettings } from "../types/settings.types";
import { useSettingsStore } from "../store/settingsStore";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import { useLocaleStore } from "../../../shared/i18n/localeStore";
import type { Locale } from "../../../shared/i18n/types";

type SettingsForm = {
  aiApiKey: string;
  aiBaseUrl: string;
  aiModel: string;
  aiImageModel: string;
  aiAudioModel: string;
  aiDefaultSystemPrompt: string;
  aiRequestTimeoutMs: string;
  aiMaxRetries: string;
  aiContextMessageLimit: string;
  pdfPreviewCharLimit: string;
  knowledgeBaseEnabled: boolean;
  knowledgeBasePath: string;
  knowledgeUseEmbeddings: boolean;
  knowledgeEmbeddingModel: string;
  webSearchEnabled: boolean;
  devModeEnabled: boolean;
  theme: Theme;
};

type SettingsTab =
  | "general"
  | "personalization"
  | "providers"
  | "advanced"
  | "keyboard";

const TAB_IDS: SettingsTab[] = [
  "general",
  "personalization",
  "providers",
  "advanced",
  "keyboard"
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
    aiContextMessageLimit: String(settings.aiContextMessageLimit),
    pdfPreviewCharLimit: String(settings.pdfPreviewCharLimit),
    knowledgeBaseEnabled: settings.knowledgeBaseEnabled,
    knowledgeBasePath: settings.knowledgeBasePath,
    knowledgeUseEmbeddings: settings.knowledgeUseEmbeddings,
    knowledgeEmbeddingModel: settings.knowledgeEmbeddingModel,
    webSearchEnabled: settings.webSearchEnabled,
    devModeEnabled: settings.devModeEnabled,
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
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const settings = useSettingsStore((s) => s.settings);
  const loading = useSettingsStore((s) => s.loading);
  const saving = useSettingsStore((s) => s.saving);
  const error = useSettingsStore((s) => s.error);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const saveSettings = useSettingsStore((s) => s.saveSettings);
  const clearError = useSettingsStore((s) => s.clearError);

  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [indexingKnowledge, setIndexingKnowledge] = useState(false);
  const [knowledgeIndexNotice, setKnowledgeIndexNotice] = useState<string | null>(null);
  const [templates, setTemplates] = useState<templateApi.ConversationTemplate[]>([]);
  const [usageDays, setUsageDays] = useState<usageApi.UsageDaySummary[]>([]);
  const [modelPricesJson, setModelPricesJson] = useState("");
  const [pricingNotice, setPricingNotice] = useState<string | null>(null);
  const [updateNotice, setUpdateNotice] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      void loadSettings();
      setSavedNotice(false);
      if (initialTab === "data" || initialTab === "storage") {
        setActiveTab("advanced");
      } else if (initialTab && TAB_IDS.includes(initialTab as SettingsTab)) {
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
    if (open && activeTab === "advanced") {
      void usageApi.apiGetUsageAnalytics(30).then(setUsageDays).catch(() => setUsageDays([]));
      void pricingApi
        .apiGetModelPrices()
        .then((prices) => setModelPricesJson(JSON.stringify(prices, null, 2)))
        .catch(() => setModelPricesJson("{}"));
      void templateApi.apiListTemplates().then(setTemplates).catch(() => setTemplates([]));
    }
  }, [open, activeTab]);

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
    const aiContextMessageLimit = Number(form.aiContextMessageLimit);
    const pdfPreviewCharLimit = Number(form.pdfPreviewCharLimit);
    if (
      !Number.isFinite(aiRequestTimeoutMs) ||
      !Number.isFinite(aiMaxRetries) ||
      !Number.isFinite(aiContextMessageLimit) ||
      !Number.isFinite(pdfPreviewCharLimit)
    ) {
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
      aiMaxRetries: Math.round(aiMaxRetries),
      aiContextMessageLimit: Math.round(aiContextMessageLimit),
      pdfPreviewCharLimit: Math.round(pdfPreviewCharLimit),
      knowledgeBaseEnabled: form.knowledgeBaseEnabled,
      knowledgeBasePath: form.knowledgeBasePath.trim(),
      knowledgeUseEmbeddings: form.knowledgeUseEmbeddings,
      knowledgeEmbeddingModel: form.knowledgeEmbeddingModel.trim(),
      webSearchEnabled: form.webSearchEnabled,
      devModeEnabled: form.devModeEnabled
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
  const showSaveFooter =
    activeTab === "general" ||
    activeTab === "providers" ||
    activeTab === "personalization" ||
    activeTab === "advanced";

  const handleReindexKnowledge = async () => {
    setIndexingKnowledge(true);
    setKnowledgeIndexNotice(null);
    try {
      const result = await libraryApi.apiIndexKnowledgeBase();
      setKnowledgeIndexNotice(
        `Indexed ${result.fileCount} file(s) into ${result.chunkCount} chunk(s).`
      );
    } catch (e) {
      setKnowledgeIndexNotice(e instanceof Error ? e.message : "Knowledge index failed");
    } finally {
      setIndexingKnowledge(false);
    }
  };

  const tabLabels: Record<SettingsTab, string> = {
    general: t.settings.general,
    personalization: t.settings.personalization,
    providers: t.settings.providers,
    advanced: t.settings.advanced,
    keyboard: t.settings.keyboard
  };

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
          <h2 id="settings-title">{t.settings.title}</h2>
          <button type="button" className="settings-close" onClick={onClose} aria-label={t.settings.close}>
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
            {t.settings.saved}
          </div>
        ) : null}

        <div className="settings-layout">
          <nav className="settings-nav" aria-label="Settings sections">
            {TAB_IDS.map((tabId) => (
              <button
                key={tabId}
                type="button"
                className={activeTab === tabId ? "settings-nav-item active" : "settings-nav-item"}
                onClick={() => setActiveTab(tabId)}
              >
                {tabLabels[tabId]}
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
                    <h3>{t.settings.general}</h3>
                    <label className="settings-field">
                      {t.settings.language}
                      <select
                        value={locale}
                        onChange={(e) => setLocale(e.target.value as Locale)}
                      >
                        <option value="en">{t.settings.english}</option>
                        <option value="fa">{t.settings.persian}</option>
                      </select>
                      <span className="settings-hint">{t.settings.languageHint}</span>
                    </label>
                    <label className="settings-field">
                      {t.settings.appearance}
                      <select
                        value={form.theme}
                        onChange={(e) =>
                          setForm((f) => (f ? { ...f, theme: e.target.value as Theme } : f))
                        }
                      >
                        <option value="light">{t.settings.light}</option>
                        <option value="dark">{t.settings.dark}</option>
                      </select>
                    </label>
                    <p className="settings-hint">{t.settings.generalHint}</p>
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
                    <ProvidersPanel />
                    <section className="settings-section">
                      <h3>Context memory</h3>
                      <p className="settings-hint">
                        Limit how many prior messages are sent to the model (0 = unlimited). Helps
                        stay within context windows on long threads.
                      </p>
                      <label className="settings-field">
                        Truncate history to last N messages
                        <input
                          type="number"
                          min={0}
                          max={500}
                          value={form.aiContextMessageLimit}
                          onChange={(e) =>
                            setForm((f) =>
                              f ? { ...f, aiContextMessageLimit: e.target.value } : f
                            )
                          }
                        />
                      </label>
                    </section>
                  </>
                ) : null}

                {activeTab === "advanced" ? (
                  <section className="settings-section settings-section--compact">
                    <h3>{t.settings.advanced}</h3>
                    <p className="settings-lead">
                      Optional power features. Everything stays on your machine.
                    </p>

                    <details className="settings-accordion" open={form.knowledgeBaseEnabled}>
                      <summary>Knowledge base (RAG)</summary>
                      <div className="settings-accordion-body">
                        <p className="settings-hint">
                          Search local files and inject excerpts into chats with citations.
                        </p>
                        <label className="settings-toggle">
                          <input
                            type="checkbox"
                            checked={form.knowledgeBaseEnabled}
                            onChange={(e) =>
                              setForm((prev) =>
                                prev ? { ...prev, knowledgeBaseEnabled: e.target.checked } : prev
                              )
                            }
                          />
                          <span>Enable knowledge base</span>
                        </label>
                        <label className="settings-field">
                          Folder path
                          <input
                            type="text"
                            value={form.knowledgeBasePath}
                            placeholder="C:\Users\you\Documents\notes"
                            onChange={(e) =>
                              setForm((prev) =>
                                prev ? { ...prev, knowledgeBasePath: e.target.value } : prev
                              )
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="settings-btn-secondary"
                          disabled={indexingKnowledge || !form.knowledgeBaseEnabled}
                          onClick={() => void handleReindexKnowledge()}
                        >
                          {indexingKnowledge ? "Indexing…" : "Re-index folder"}
                        </button>
                        {knowledgeIndexNotice ? (
                          <p className="settings-hint">{knowledgeIndexNotice}</p>
                        ) : null}
                        <label className="settings-toggle">
                          <input
                            type="checkbox"
                            checked={form.knowledgeUseEmbeddings}
                            onChange={(e) =>
                              setForm((prev) =>
                                prev ? { ...prev, knowledgeUseEmbeddings: e.target.checked } : prev
                              )
                            }
                          />
                          <span>Semantic embeddings</span>
                        </label>
                        {form.knowledgeUseEmbeddings ? (
                          <label className="settings-field">
                            Embedding model
                            <input
                              type="text"
                              value={form.knowledgeEmbeddingModel}
                              onChange={(e) =>
                                setForm((prev) =>
                                  prev
                                    ? { ...prev, knowledgeEmbeddingModel: e.target.value }
                                    : prev
                                )
                              }
                            />
                          </label>
                        ) : null}
                      </div>
                    </details>

                    <details className="settings-accordion">
                      <summary>Agent tools</summary>
                      <div className="settings-accordion-body">
                        <label className="settings-toggle">
                          <input
                            type="checkbox"
                            checked={form.webSearchEnabled}
                            onChange={(e) =>
                              setForm((prev) =>
                                prev ? { ...prev, webSearchEnabled: e.target.checked } : prev
                              )
                            }
                          />
                          <span>Web search (DuckDuckGo)</span>
                        </label>
                        <label className="settings-toggle">
                          <input
                            type="checkbox"
                            checked={form.devModeEnabled}
                            onChange={(e) =>
                              setForm((prev) =>
                                prev ? { ...prev, devModeEnabled: e.target.checked } : prev
                              )
                            }
                          />
                          <span>Developer mode (API prompt viewer)</span>
                        </label>
                      </div>
                    </details>

                    <details className="settings-accordion">
                      <summary>Templates &amp; usage</summary>
                      <div className="settings-accordion-body">
                        {templates.length ? (
                          <ul className="settings-mini-list">
                            {templates.map((tpl) => (
                              <li key={tpl.id}>
                                <span>{tpl.name}</span>
                                <button
                                  type="button"
                                  className="settings-link-btn"
                                  onClick={() =>
                                    void templateApi.apiDeleteTemplate(tpl.id).then(() =>
                                      templateApi.apiListTemplates().then(setTemplates)
                                    )
                                  }
                                >
                                  Delete
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="settings-hint">No templates yet. Save one with /template.</p>
                        )}
                        {usageDays.length ? (
                          <div className="usage-analytics usage-analytics--compact">
                            {usageDays.slice(0, 7).map((day) => (
                              <div key={day.date} className="usage-analytics-row">
                                <span>{day.date}</span>
                                <span>{day.totalTokens.toLocaleString()} tok</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="settings-hint">Usage appears after you send messages.</p>
                        )}
                      </div>
                    </details>

                    <details className="settings-accordion">
                      <summary>Storage &amp; limits</summary>
                      <div className="settings-accordion-body">
                        <p className="settings-hint">
                          Up to {settings?.maxImagesPerMessage ?? 4} attachments · images {maxImageMb}MB
                        </p>
                        <label className="settings-field">
                          PDF preview limit (chars)
                          <input
                            type="number"
                            min={500}
                            max={100000}
                            value={form.pdfPreviewCharLimit}
                            onChange={(e) =>
                              setForm((prev) =>
                                prev ? { ...prev, pdfPreviewCharLimit: e.target.value } : prev
                              )
                            }
                          />
                        </label>
                        {settings ? (
                          <p className="settings-hint settings-path">
                            <code>{settings.configDir}\data\</code>
                          </p>
                        ) : null}
                        <label className="settings-field">
                          Cost model prices (JSON)
                          <textarea
                            className="settings-json-editor"
                            rows={5}
                            value={modelPricesJson}
                            onChange={(e) => setModelPricesJson(e.target.value)}
                          />
                        </label>
                        <div className="settings-inline-actions">
                          <button
                            type="button"
                            className="settings-btn-secondary"
                            onClick={() => {
                              try {
                                const parsed = JSON.parse(modelPricesJson) as Record<
                                  string,
                                  pricingApi.ModelPrice
                                >;
                                void pricingApi.apiSaveModelPrices(parsed).then(() => {
                                  setPricingNotice("Prices saved.");
                                });
                              } catch {
                                setPricingNotice("Invalid JSON.");
                              }
                            }}
                          >
                            Save prices
                          </button>
                          <button
                            type="button"
                            className="settings-btn-secondary"
                            onClick={() => {
                              void pricingApi.apiCheckForUpdates().then((result) => {
                                setUpdateNotice(result.message);
                              });
                            }}
                          >
                            Check updates
                          </button>
                        </div>
                        {pricingNotice ? <p className="settings-hint">{pricingNotice}</p> : null}
                        {updateNotice ? <p className="settings-hint">{updateNotice}</p> : null}
                      </div>
                    </details>
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
                          <td>Open settings</td>
                          <td>
                            <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>;</kbd>
                          </td>
                        </tr>
                        <tr>
                          <td>Slash commands</td>
                          <td>
                            Type <kbd>/</kbd> in the composer
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
                      {saving ? t.projectSettings.saving : t.settings.save}
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
