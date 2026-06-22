import { useEffect, useRef } from "react";

type Props = {
  initialContent: string;
  saving: boolean;
  onSave: (content: string) => void;
  onCancel: () => void;
};

export function MessageEditForm({ initialContent, saving, onSave, onCancel }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  const onSubmit = () => {
    const value = textareaRef.current?.value.trim() ?? "";
    if (!value || saving) return;
    onSave(value);
  };

  return (
    <div className="message-edit-form">
      <textarea
        ref={textareaRef}
        className="message-edit-textarea"
        defaultValue={initialContent}
        disabled={saving}
        rows={3}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            onSubmit();
          }
        }}
      />
      <div className="message-edit-actions">
        <button
          type="button"
          className="message-action-btn message-edit-save"
          disabled={saving}
          onClick={onSubmit}
        >
          {saving ? "Saving…" : "Save & resend"}
        </button>
        <button
          type="button"
          className="message-action-btn"
          disabled={saving}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
