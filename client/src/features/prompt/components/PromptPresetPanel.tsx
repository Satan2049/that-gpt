import { type FormEvent, useState } from "react";
import type { PromptPreset } from "../types/prompt.types";
import { usePromptStore } from "../store/promptStore";

const MODEL_FALLBACK = "gpt-4o-mini";

function emptyForm() {
  return {
    name: "",
    systemPrompt: "",
    temperature: "0.7",
    maxTokens: "2048",
    model: ""
  };
}

export function PromptPresetPanel() {
  const presets = usePromptStore((s) => s.presets);
  const loading = usePromptStore((s) => s.loading);
  const error = usePromptStore((s) => s.error);
  const createPreset = usePromptStore((s) => s.createPreset);
  const updatePreset = usePromptStore((s) => s.updatePreset);
  const deletePreset = usePromptStore((s) => s.deletePreset);
  const clearError = usePromptStore((s) => s.clearError);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const startEdit = (preset: PromptPreset) => {
    setEditingId(preset.id);
    setForm({
      name: preset.name,
      systemPrompt: preset.systemPrompt,
      temperature: String(preset.temperature),
      maxTokens: String(preset.maxTokens),
      model: preset.model
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const temperature = Number(form.temperature);
    const maxTokens = Number(form.maxTokens);
    const name = form.name.trim();
    const systemPrompt = form.systemPrompt.trim();
    const model = form.model.trim();

    if (!name || !systemPrompt) return;
    if (!Number.isFinite(temperature) || !Number.isFinite(maxTokens)) return;

    let ok = false;
    if (editingId) {
      ok = await updatePreset(editingId, {
        name,
        systemPrompt,
        temperature,
        maxTokens: Math.round(maxTokens),
        model: model || MODEL_FALLBACK
      });
    } else {
      ok = await createPreset({
        name,
        systemPrompt,
        temperature,
        maxTokens: Math.round(maxTokens),
        ...(model ? { model } : {})
      });
    }
    if (ok) resetForm();
  };

  return (
    <details className="preset-panel">
      <summary className="preset-panel-summary">Prompt presets</summary>

      {error ? (
        <div className="preset-inline-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={clearError}>
            Dismiss
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="sidebar-placeholder">Loading presets…</div>
      ) : (
        <ul className="preset-list">
          {presets.map((preset) => (
            <li key={preset.id} className="preset-list-item">
              <div className="preset-list-main">
                <span className="preset-list-name">{preset.name}</span>
                <span className="preset-list-meta">
                  {preset.model} · temp {preset.temperature}
                </span>
              </div>
              <div className="preset-list-actions">
                <button type="button" onClick={() => startEdit(preset)}>
                  Edit
                </button>
                <button type="button" onClick={() => void deletePreset(preset.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form className="preset-form" onSubmit={(e) => void handleSubmit(e)}>
        <div className="preset-form-title">{editingId ? "Edit preset" : "New preset"}</div>
        <label className="preset-field">
          Name
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </label>
        <label className="preset-field">
          System prompt
          <textarea
            value={form.systemPrompt}
            onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))}
            rows={4}
            required
          />
        </label>
        <div className="preset-field-row">
          <label className="preset-field">
            Temperature
            <input
              type="number"
              step="0.1"
              min={0}
              max={2}
              value={form.temperature}
              onChange={(e) => setForm((f) => ({ ...f, temperature: e.target.value }))}
              required
            />
          </label>
          <label className="preset-field">
            Max tokens
            <input
              type="number"
              min={1}
              value={form.maxTokens}
              onChange={(e) => setForm((f) => ({ ...f, maxTokens: e.target.value }))}
              required
            />
          </label>
        </div>
        <label className="preset-field">
          Model
          <input
            type="text"
            value={form.model}
            onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
            placeholder={`Optional for new · server default ${MODEL_FALLBACK}`}
          />
        </label>
        <div className="preset-form-actions">
          <button type="submit">{editingId ? "Save changes" : "Create preset"}</button>
          {editingId ? (
            <button type="button" onClick={resetForm}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </details>
  );
}
