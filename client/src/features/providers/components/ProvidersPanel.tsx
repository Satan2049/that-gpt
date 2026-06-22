import { useEffect, useState } from "react";
import type { ProviderKind, ProviderProfile, UpsertProviderInput } from "../types/provider.types";
import { useProviderStore } from "../store/providerStore";
import { ConfirmModal } from "../../../shared/components/ConfirmModal";

const OLLAMA_DEFAULT_URL = "http://127.0.0.1:11434";

type EditorState = {
  id?: string;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  imageModel: string;
  audioModel: string;
};

function emptyEditor(): EditorState {
  return {
    name: "",
    kind: "openai",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "",
    defaultModel: "gpt-4o-mini",
    imageModel: "",
    audioModel: ""
  };
}

function fromProfile(profile: ProviderProfile): EditorState {
  return {
    id: profile.id,
    name: profile.name,
    kind: profile.kind,
    baseUrl: profile.baseUrl,
    apiKey: profile.apiKey,
    defaultModel: profile.defaultModel,
    imageModel: profile.imageModel,
    audioModel: profile.audioModel
  };
}

function toInput(editor: EditorState): UpsertProviderInput {
  return {
    id: editor.id,
    name: editor.name,
    kind: editor.kind,
    baseUrl: editor.baseUrl,
    apiKey: editor.apiKey,
    defaultModel: editor.defaultModel,
    imageModel: editor.imageModel,
    audioModel: editor.audioModel
  };
}

export function ProvidersPanel() {
  const store = useProviderStore((s) => s.store);
  const loading = useProviderStore((s) => s.loading);
  const saving = useProviderStore((s) => s.saving);
  const testing = useProviderStore((s) => s.testing);
  const error = useProviderStore((s) => s.error);
  const loadProviders = useProviderStore((s) => s.loadProviders);
  const upsertProvider = useProviderStore((s) => s.upsertProvider);
  const deleteProvider = useProviderStore((s) => s.deleteProvider);
  const setActiveProvider = useProviderStore((s) => s.setActiveProvider);
  const testProvider = useProviderStore((s) => s.testProvider);
  const clearError = useProviderStore((s) => s.clearError);

  const [editor, setEditor] = useState<EditorState>(emptyEditor());
  const [testResult, setTestResult] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  const startNew = (kind: ProviderKind = "openai") => {
    const next = emptyEditor();
    if (kind === "ollama") {
      next.kind = "ollama";
      next.name = "Ollama (local)";
      next.baseUrl = OLLAMA_DEFAULT_URL;
      next.defaultModel = "llama3.2";
      next.apiKey = "";
    }
    setEditor(next);
    setTestResult(null);
  };

  const startEdit = (profile: ProviderProfile) => {
    setEditor(fromProfile(profile));
    setTestResult(null);
  };

  const onKindChange = (kind: ProviderKind) => {
    setEditor((prev) => ({
      ...prev,
      kind,
      baseUrl: kind === "ollama" ? OLLAMA_DEFAULT_URL : "https://api.openai.com/v1",
      name: kind === "ollama" ? "Ollama (local)" : prev.name || "OpenAI"
    }));
  };

  const onSave = async () => {
    const ok = await upsertProvider(toInput(editor));
    if (ok) setEditor(emptyEditor());
  };

  const onTest = async () => {
    const result = await testProvider(toInput(editor));
    setTestResult(result.message);
  };

  if (loading && !store) {
    return <p className="settings-hint">Loading providers…</p>;
  }

  const providers = store?.providers ?? [];

  return (
    <div className="providers-panel">
      {error ? (
        <div className="settings-banner-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={clearError}>
            Dismiss
          </button>
        </div>
      ) : null}

      <section className="settings-section">
        <h3>Provider profiles</h3>
        <p className="settings-hint">
          Switch between OpenAI-compatible APIs and local Ollama. The active provider syncs to your
          .env settings.
        </p>

        <ul className="providers-list">
          {providers.map((profile) => (
            <li key={profile.id} className="providers-list-item">
              <button
                type="button"
                className={
                  store?.activeId === profile.id
                    ? "providers-list-btn active"
                    : "providers-list-btn"
                }
                onClick={() => void setActiveProvider(profile.id)}
              >
                <span className="providers-list-name">{profile.name}</span>
                <span className="providers-list-meta">
                  {profile.kind} · {profile.defaultModel}
                </span>
              </button>
              <button type="button" className="providers-list-edit" onClick={() => startEdit(profile)}>
                Edit
              </button>
              {providers.length > 1 ? (
                <button
                  type="button"
                  className="providers-list-delete"
                  onClick={() => setPendingDelete({ id: profile.id, name: profile.name })}
                >
                  ×
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        <div className="settings-inline-actions">
          <button type="button" onClick={() => startNew("openai")}>
            Add API provider
          </button>
          <button type="button" onClick={() => startNew("ollama")}>
            Add Ollama
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h3>{editor.id ? "Edit provider" : "New provider"}</h3>
        <label className="settings-field">
          Name
          <input
            type="text"
            value={editor.name}
            onChange={(e) => setEditor((p) => ({ ...p, name: e.target.value }))}
          />
        </label>
        <label className="settings-field">
          Type
          <select
            value={editor.kind}
            onChange={(e) => onKindChange(e.target.value as ProviderKind)}
          >
            <option value="openai">OpenAI-compatible</option>
            <option value="ollama">Ollama (local)</option>
          </select>
        </label>
        <label className="settings-field">
          Base URL
          <input
            type="url"
            value={editor.baseUrl}
            onChange={(e) => setEditor((p) => ({ ...p, baseUrl: e.target.value }))}
          />
        </label>
        {editor.kind !== "ollama" ? (
          <label className="settings-field">
            API key
            <input
              type="password"
              value={editor.apiKey}
              onChange={(e) => setEditor((p) => ({ ...p, apiKey: e.target.value }))}
              autoComplete="off"
            />
          </label>
        ) : (
          <p className="settings-hint">Ollama runs locally — no API key required.</p>
        )}
        <label className="settings-field">
          Default model
          <input
            type="text"
            value={editor.defaultModel}
            onChange={(e) => setEditor((p) => ({ ...p, defaultModel: e.target.value }))}
          />
        </label>
        <label className="settings-field">
          Image generation model (e.g. gpt-image-1, dall-e-3, flux)
          <input
            type="text"
            placeholder="gpt-image-1"
            value={editor.imageModel}
            onChange={(e) => setEditor((p) => ({ ...p, imageModel: e.target.value }))}
          />
        </label>
        <label className="settings-field">
          Audio model (optional)
          <input
            type="text"
            value={editor.audioModel}
            onChange={(e) => setEditor((p) => ({ ...p, audioModel: e.target.value }))}
          />
        </label>
        <div className="settings-action-row">
          <button type="button" disabled={testing} onClick={() => void onTest()}>
            {testing ? "Testing…" : "Test connection"}
          </button>
          <button type="button" className="btn-primary" disabled={saving} onClick={() => void onSave()}>
            {saving ? "Saving…" : "Save provider"}
          </button>
        </div>
        {testResult ? <p className="settings-hint">{testResult}</p> : null}
      </section>

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title="Delete provider?"
        message={
          pendingDelete ? `Delete provider "${pendingDelete.name}"?` : ""
        }
        confirmLabel="Delete"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) void deleteProvider(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
