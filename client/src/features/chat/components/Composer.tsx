import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import {
  isAllowedImageMime
} from "../lib/imageAttachmentLimits";
import { useImageLimits } from "../../settings/store/settingsStore";
import { readFileAsBase64Data } from "../lib/readImageAttachment";
import { useChatStore } from "../store/chatStore";

type PendingAttachment = {
  key: string;
  file: File;
  previewUrl: string;
};

export function Composer() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<PendingAttachment[]>([]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);

  const activeId = useChatStore((s) => s.activeConversationId);
  const sending = useChatStore((s) => s.sending);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const { maxCount: maxImages, maxBytes: maxImageBytes } = useImageLimits();
  const maxImageMb = (maxImageBytes / (1024 * 1024)).toFixed(0);

  pendingRef.current = pending;

  useEffect(() => {
    return () => {
      pendingRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  const disabled = !activeId || sending || preparing;
  const canSubmit =
    Boolean(activeId) &&
    !sending &&
    !preparing &&
    (text.trim().length > 0 || pending.length > 0);

  const removePending = (key: string) => {
    setPending((prev) => {
      const item = prev.find((p) => p.key === key);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((p) => p.key !== key);
    });
  };

  const onPickFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []);
    setLocalError(null);
    if (!incoming.length) return;

    setPending((prev) => {
      let next = [...prev];
      for (const file of incoming) {
        if (next.length >= maxImages) {
          setLocalError(`At most ${maxImages} images per message.`);
          break;
        }
        if (!isAllowedImageMime(file.type)) {
          setLocalError("Invalid image type. Use JPEG, PNG, or WebP.");
          continue;
        }
        if (file.size > maxImageBytes) {
          setLocalError(`Each image must be at most ${maxImageMb}MB.`);
          continue;
        }
        next.push({
          key: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file)
        });
      }
      return next;
    });
    e.target.value = "";
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !activeId) return;

    const trimmed = text.trim();
    const attachments = [...pending];

    setLocalError(null);
    setPreparing(true);
    try {
      const images =
        attachments.length > 0
          ? await Promise.all(
              attachments.map(async (a) => ({
                mimeType: a.file.type,
                base64: await readFileAsBase64Data(a.file)
              }))
            )
          : undefined;

      await sendMessage(trimmed, images);
      attachments.forEach((a) => URL.revokeObjectURL(a.previewUrl));
      setPending([]);
      setText("");
    } finally {
      setPreparing(false);
    }
  };

  return (
    <form className="composer composer-form" onSubmit={(ev) => void onSubmit(ev)}>
      {localError ? (
        <div className="composer-local-error" role="status">
          {localError}
        </div>
      ) : null}

      {pending.length > 0 ? (
        <div className="composer-attachments">
          {pending.map((p) => (
            <div key={p.key} className="attachment-chip">
              <img src={p.previewUrl} alt="" className="attachment-chip-thumb" />
              <button
                type="button"
                className="attachment-chip-remove"
                disabled={disabled}
                aria-label="Remove image"
                onClick={() => removePending(p.key)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="composer-file-input"
        aria-hidden="true"
        tabIndex={-1}
        onChange={onPickFiles}
        disabled={disabled || pending.length >= maxImages}
      />
      <div className="composer-row">
        <button
          type="button"
          className="composer-attach-btn"
          disabled={disabled || pending.length >= maxImages}
          onClick={() => fileInputRef.current?.click()}
        >
          Image
        </button>
        <input
          type="text"
          className="composer-text-input"
          value={text}
          onChange={(ev) => setText(ev.target.value)}
          placeholder={
            activeId ? "Message or attach images…" : "Select or create a conversation"
          }
          disabled={disabled}
          autoComplete="off"
        />
        <button type="submit" disabled={!canSubmit}>
          {preparing ? "Preparing…" : sending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}
