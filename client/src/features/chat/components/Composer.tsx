import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent
} from "react";
import {
  attachmentKindFromMime,
  FILE_INPUT_ACCEPT,
  isAllowedAttachmentMime,
  MAX_ATTACHMENTS_PER_MESSAGE,
  maxBytesForMime
} from "../lib/attachmentLimits";
import { requestOpenModelSelector } from "../lib/modelUtils";
import {
  filterSlashCommands,
  resolveSlashCommand,
  SLASH_COMMANDS,
  type SlashCommand
} from "../lib/slashCommands";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { useImageLimits } from "../../settings/store/settingsStore";
import { usePromptStore } from "../../prompt/store/promptStore";
import { readFileAsBase64Data } from "../lib/readFileAttachment";
import { useChatStore } from "../store/chatStore";
import { useVoiceInput } from "../hooks/useVoiceInput";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import { autoDirProps } from "../../../shared/i18n/textDirection";

type PendingAttachment = {
  key: string;
  file: File;
  previewUrl?: string;
  kind: "image" | "audio" | "text" | "pdf";
};

export type ComposerHandle = {
  focus: () => void;
  setDraft: (text: string) => void;
};

const TEXTAREA_MIN_HEIGHT_PX = 24;
const TEXTAREA_MAX_HEIGHT_PX = 200;

const DRAFT_PREFIX = "thatgpt:draft:";

export const Composer = forwardRef<ComposerHandle>(function Composer(_props, ref) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachMenuRef = useRef<HTMLDetailsElement>(null);
  const pendingRef = useRef<PendingAttachment[]>([]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);

  const activeId = useChatStore((s) => s.activeConversationId);
  const sending = useChatStore((s) => s.sending);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const stopGeneration = useChatStore((s) => s.stopGeneration);
  const createConversation = useChatStore((s) => s.createConversation);
  const exportActiveConversation = useChatStore((s) => s.exportActiveConversation);
  const patchConversation = useChatStore((s) => s.patchConversation);
  const presets = usePromptStore((s) => s.presets);
  const { maxCount: maxAttachments } = useImageLimits();

  const appendTranscript = (transcript: string) => {
    setText((prev) => (prev.trim() ? `${prev.trimEnd()} ${transcript}` : transcript));
    textareaRef.current?.focus();
  };

  const {
    listening,
    error: voiceError,
    startListening,
    stopListening,
    clearError: clearVoiceError
  } = useVoiceInput(appendTranscript);

  pendingRef.current = pending;

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    setDraft: (value: string) => {
      setText(value);
      textareaRef.current?.focus();
    }
  }));

  useEffect(() => {
    if (!activeId) {
      setText("");
      return;
    }
    setText(localStorage.getItem(`${DRAFT_PREFIX}${activeId}`) ?? "");
    textareaRef.current?.focus();
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    if (text.trim()) {
      localStorage.setItem(`${DRAFT_PREFIX}${activeId}`, text);
    } else {
      localStorage.removeItem(`${DRAFT_PREFIX}${activeId}`);
    }
  }, [activeId, text]);

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

  const slashQuery = text.trimStart();
  const slashSuggestions: SlashCommand[] = (() => {
    if (!slashQuery.startsWith("/")) return [];
    const promptMatch = /^\/prompt(?:\s+(.*))?$/i.exec(slashQuery);
    if (promptMatch) {
      const q = (promptMatch[1] ?? "").trim().toLowerCase();
      return presets
        .filter((p) => !q || p.name.toLowerCase().includes(q))
        .slice(0, 8)
        .map((p) => ({
          name: `/prompt ${p.name}`,
          description: p.systemPrompt.slice(0, 80)
        }));
    }
    return filterSlashCommands(slashQuery);
  })();
  const slashMode = slashSuggestions.length > 0 && slashQuery.startsWith("/");

  useEffect(() => {
    setSlashIndex(0);
  }, [text]);

  const runSlashCommand = async (command: SlashCommand) => {
    const trimmed = text.trim();
    const presetMatch = /^\/prompt\s+(.+)$/i.exec(trimmed);

    if (presetMatch) {
      const presetName = presetMatch[1].trim().toLowerCase();
      const preset = presets.find((p) => p.name.toLowerCase() === presetName);
      if (preset) {
        await patchConversation({ promptPresetId: preset.id });
      }
      setText("");
      return;
    }

    const resolved = resolveSlashCommand(trimmed.split(/\s/)[0] ?? "");
    const cmd = resolved ?? command;

    switch (cmd.name) {
      case "/new":
        await createConversation();
        setText("");
        break;
      case "/clear":
        setText("");
        setPending((prev) => {
          prev.forEach((p) => {
            if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
          });
          return [];
        });
        break;
      case "/model":
        requestOpenModelSelector();
        setText("");
        break;
      case "/export":
        await exportActiveConversation("markdown");
        setText("");
        break;
      case "/temp":
        await createConversation({ ephemeral: true });
        setText("");
        break;
      case "/help":
        setText(
          SLASH_COMMANDS.map((c) => `${c.name} — ${c.description}`).join("\n")
        );
        break;
      case "/prompt":
        setText("/prompt ");
        break;
      default:
        break;
    }
  };

  const removePending = (key: string) => {
    setPending((prev) => {
      const item = prev.find((p) => p.key === key);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((p) => p.key !== key);
    });
  };

  const addFiles = (incoming: File[]) => {
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
          setLocalError("Unsupported file type. Use images, audio, PDF, or text files.");
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
  };

  const onPickFiles = (e: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
    attachMenuRef.current?.removeAttribute("open");
  };

  const submitMessage = async () => {
    if (slashMode) {
      const cmd = slashSuggestions[slashIndex] ?? slashSuggestions[0];
      if (cmd) {
        await runSlashCommand(cmd);
      }
      return;
    }

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
      if (activeId) localStorage.removeItem(`${DRAFT_PREFIX}${activeId}`);
    } finally {
      setPreparing(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submitMessage();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashMode) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIndex((i) => Math.min(i + 1, slashSuggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        const cmd = slashSuggestions[slashIndex];
        if (cmd) setText(`${cmd.name} `);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (slashMode || canSubmit) {
        void submitMessage();
      }
    }
  };

  const openFilePicker = (accept?: string) => {
    const input = fileInputRef.current;
    if (!input) return;
    input.accept = accept ?? FILE_INPUT_ACCEPT;
    input.click();
  };

  return (
    <form
      className="composer composer-form composer-pill"
      onSubmit={onSubmit}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        addFiles(Array.from(e.dataTransfer.files ?? []));
      }}
    >
      {localError || voiceError ? (
        <div className="composer-local-error" role="status">
          {localError ?? voiceError}
          {voiceError ? (
            <button type="button" className="composer-error-dismiss" onClick={clearVoiceError}>
              ×
            </button>
          ) : null}
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

      <div className="composer-pill-row">
        <details ref={attachMenuRef} className="composer-attach-menu">
          <summary className="composer-attach-btn" aria-label="Add attachments">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </summary>
          <div className="composer-attach-panel">
            <button type="button" onClick={() => openFilePicker()} disabled={disabled}>
              Upload file
            </button>
            <button
              type="button"
              onClick={() => openFilePicker("image/jpeg,image/png,image/webp,image/gif")}
              disabled={disabled}
            >
              {t.chat.uploadImage}
            </button>
          </div>
        </details>

        {slashMode ? (
          <SlashCommandMenu
            commands={slashSuggestions}
            activeIndex={slashIndex}
            onSelect={(cmd) => void runSlashCommand(cmd)}
          />
        ) : null}

        <textarea
          ref={textareaRef}
          className="composer-textarea"
          value={text}
          onChange={(ev) => setText(ev.target.value)}
          onKeyDown={onKeyDown}
          onPaste={(e) => {
            const files = Array.from(e.clipboardData.files ?? []);
            if (files.length > 0) {
              e.preventDefault();
              addFiles(files);
            }
          }}
          placeholder={activeId ? t.chat.askAnything : t.chat.selectConversation}
          disabled={disabled}
          autoComplete="off"
          rows={1}
          {...autoDirProps}
        />

        <button
          type="button"
          className={listening ? "composer-voice-btn active" : "composer-voice-btn"}
          aria-label={listening ? t.chat.stopVoice : t.chat.startVoice}
          aria-pressed={listening}
          disabled={!activeId || preparing}
          onPointerDown={(e) => {
            e.preventDefault();
            if (!listening) void startListening();
          }}
          onPointerUp={() => {
            if (listening) void stopListening();
          }}
          onPointerLeave={() => {
            if (listening) void stopListening();
          }}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              if (!listening) void startListening();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              if (listening) void stopListening();
            }
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 14a3 3 0 003-3V7a3 3 0 10-6 0v4a3 3 0 003 3z" strokeLinecap="round" />
            <path d="M19 11a7 7 0 01-14 0M12 18v3" strokeLinecap="round" />
          </svg>
        </button>

        {sending ? (
          <button
            type="button"
            className="composer-send-btn composer-stop-btn"
            aria-label={t.chat.stopGenerating}
            onClick={() => void stopGeneration()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
          </button>
        ) : (
          <button
            type="submit"
            className="composer-send-btn"
            disabled={!canSubmit}
            aria-label={t.chat.sendMessage}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </form>
  );
});
