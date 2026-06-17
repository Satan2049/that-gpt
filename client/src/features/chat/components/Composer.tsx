import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState
} from "react";
import {
  attachmentKindFromMime,
  FILE_INPUT_ACCEPT,
  isAllowedAttachmentMime,
  MAX_ATTACHMENTS_PER_MESSAGE,
  maxBytesForMime
} from "../lib/attachmentLimits";
import { useImageLimits } from "../../settings/store/settingsStore";
import { readFileAsBase64Data } from "../lib/readFileAttachment";
import { useChatStore } from "../store/chatStore";

type PendingAttachment = {
  key: string;
  file: File;
  previewUrl?: string;
  kind: "image" | "audio" | "text" | "pdf";
};

const TEXTAREA_MIN_HEIGHT_PX = 42;
const TEXTAREA_MAX_HEIGHT_PX = 200;

export function Composer() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingRef = useRef<PendingAttachment[]>([]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);

  const activeId = useChatStore((s) => s.activeConversationId);
  const sending = useChatStore((s) => s.sending);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const stopGeneration = useChatStore((s) => s.stopGeneration);
  const { maxCount: maxAttachments } = useImageLimits();

  pendingRef.current = pending;

  useEffect(() => {
    return () => {
      pendingRef.current.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
    };
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const nextHeight = Math.min(
      Math.max(el.scrollHeight, TEXTAREA_MIN_HEIGHT_PX),
      TEXTAREA_MAX_HEIGHT_PX
    );
    el.style.height = `${nextHeight}px`;
  }, [text]);

  const disabled = !activeId || sending || preparing;
  const canSubmit =
    Boolean(activeId) &&
    !sending &&
    !preparing &&
    (text.trim().length > 0 || pending.length > 0);

  const removePending = (key: string) => {
    setPending((prev) => {
      const item = prev.find((p) => p.key === key);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((p) => p.key !== key);
    });
  };

  const onPickFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []);
    setLocalError(null);
    if (!incoming.length) return;

    const limit = Math.min(maxAttachments, MAX_ATTACHMENTS_PER_MESSAGE);

    setPending((prev) => {
      let next = [...prev];
      for (const file of incoming) {
        if (next.length >= limit) {
          setLocalError(`At most ${limit} attachments per message.`);
          break;
        }
        if (!isAllowedAttachmentMime(file.type)) {
          setLocalError(
            "Unsupported file type. Use images, audio, PDF, or text files."
          );
          continue;
        }
        const maxBytes = maxBytesForMime(file.type);
        if (file.size > maxBytes) {
          const maxMb = (maxBytes / (1024 * 1024)).toFixed(file.type.startsWith("text/") ? 1 : 0);
          setLocalError(`File too large (max ${maxMb}MB for this type).`);
          continue;
        }
        const kind = attachmentKindFromMime(file.type);
        if (!kind) continue;
        next.push({
          key: crypto.randomUUID(),
          file,
          kind,
          previewUrl: kind === "image" ? URL.createObjectURL(file) : undefined
        });
      }
      return next;
    });
    e.target.value = "";
  };

  const submitMessage = async () => {
    if (!canSubmit || !activeId) return;

    const trimmed = text.trim();
    const attachments = [...pending];

    setLocalError(null);
    setPreparing(true);
    try {
      const payloads =
        attachments.length > 0
          ? await Promise.all(
              attachments.map(async (a) => ({
                mimeType: a.file.type,
                base64: await readFileAsBase64Data(a.file),
                filename: a.file.name
              }))
            )
          : undefined;

      await sendMessage(trimmed, payloads);
      attachments.forEach((a) => {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      });
      setPending([]);
      setText("");
    } finally {
      setPreparing(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submitMessage();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submitMessage();
    }
  };

  return (
    <form className="composer composer-form" onSubmit={onSubmit}>
      {localError ? (
        <div className="composer-local-error" role="status">
          {localError}
        </div>
      ) : null}

      {pending.length > 0 ? (
        <div className="composer-attachments">
          {pending.map((p) => (
            <div key={p.key} className="attachment-chip">
              {p.kind === "image" && p.previewUrl ? (
                <img src={p.previewUrl} alt="" className="attachment-chip-thumb" />
              ) : (
                <span className="attachment-chip-label" title={p.file.name}>
                  {p.kind === "audio" ? "🎵" : p.kind === "pdf" ? "📕" : "📄"} {p.file.name}
                </span>
              )}
              <button
                type="button"
                className="attachment-chip-remove"
                disabled={disabled}
                aria-label="Remove attachment"
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
        accept={FILE_INPUT_ACCEPT}
        multiple
        className="composer-file-input"
        aria-hidden="true"
        tabIndex={-1}
        onChange={onPickFiles}
        disabled={disabled || pending.length >= maxAttachments}
      />
      <div className="composer-row">
        <button
          type="button"
          className="composer-attach-btn"
          disabled={disabled || pending.length >= maxAttachments}
          onClick={() => fileInputRef.current?.click()}
        >
          Attach
        </button>
        <textarea
          ref={textareaRef}
          className="composer-textarea"
          value={text}
          onChange={(ev) => setText(ev.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            activeId
              ? "Message… (Enter to send, Shift+Enter for newline)"
              : "Select or create a conversation"
          }
          disabled={disabled}
          autoComplete="off"
          rows={1}
        />
        {sending ? (
          <button
            type="button"
            className="composer-stop-btn"
            onClick={() => void stopGeneration()}
          >
            Stop
          </button>
        ) : (
          <button type="submit" disabled={!canSubmit}>
            {preparing ? "Preparing…" : "Send"}
          </button>
        )}
      </div>
    </form>
  );
}
