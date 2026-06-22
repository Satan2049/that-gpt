import { useEffect, useState } from "react";
import * as chatApi from "../services/chatApi";

type Props = {
  open: boolean;
  conversationId: string | null;
  onClose: () => void;
};

export function PromptPreviewModal({ open, conversationId, onClose }: Props) {
  const [lines, setLines] = useState<Array<{ role: string; content: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !conversationId) return;

    setLoading(true);
    setError(null);
    void chatApi
      .apiPreviewApiMessages(conversationId)
      .then(setLines)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load prompt"))
      .finally(() => setLoading(false));
  }, [open, conversationId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="API prompt preview">
      <div className="modal-card prompt-preview-modal">
        <header className="modal-header">
          <h2>Raw API messages</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="modal-body">
          {loading ? <p>Loading…</p> : null}
          {error ? <p className="settings-error">{error}</p> : null}
          {!loading && !error ? (
            <pre className="prompt-preview-body">
              {lines
                .map((line) => `### ${line.role}\n${line.content}`)
                .join("\n\n---\n\n")}
            </pre>
          ) : null}
        </div>
      </div>
    </div>
  );
}
