import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatAttachment, ChatMessage } from "../types/chat.types";
import { MessageMarkdown } from "./MessageMarkdown";
import { MessageActions } from "./MessageActions";
import { MessageEditForm } from "./MessageEditForm";
import { UserMessageActions } from "./UserMessageActions";
import { useChatStore } from "../store/chatStore";
import { getBranchSiblings, getVisibleMessages } from "../lib/branchUtils";
import { BrandMark } from "../../../shared/components/BrandMark";
import { Skeleton } from "../../../shared/components/Skeleton";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import { autoDirProps } from "../../../shared/i18n/textDirection";

type Props = {
  messages: ChatMessage[];
  loading: boolean;
  streamingMessageId?: string | null;
  onSuggestion?: (text: string) => void;
};

const SCROLL_THRESHOLD_PX = 96;

function collectAttachments(msg: ChatMessage): ChatAttachment[] {
  const fromField = msg.attachments ?? [];
  const fromImages =
    msg.images?.map((img) => ({
      kind: "image" as const,
      mimeType: img.mimeType,
      base64: img.base64
    })) ?? [];
  const seen = new Set(fromField.map((a) => `${a.kind}:${a.mimeType}:${a.base64.slice(0, 16)}`));
  const merged = [...fromField];
  for (const img of fromImages) {
    const key = `${img.kind}:${img.mimeType}:${img.base64.slice(0, 16)}`;
    if (!seen.has(key)) merged.push(img);
  }
  return merged;
}

function AttachmentPreview({ attachments }: { attachments: ChatAttachment[] }) {
  if (!attachments.length) return null;
  return (
    <div className="message-attachments">
      {attachments.map((att, idx) => {
        if (att.kind === "image" || att.mimeType.startsWith("image/")) {
          return (
            <img
              key={`att-img-${idx}`}
              src={`data:${att.mimeType};base64,${att.base64}`}
              alt={att.filename ?? "Attached image"}
              className="message-image-thumb"
            />
          );
        }
        if (att.kind === "audio" || att.mimeType.startsWith("audio/")) {
          return (
            <div key={`att-audio-${idx}`} className="message-file-chip">
              <span className="message-file-icon" aria-hidden="true">
                🎵
              </span>
              <span className="message-file-name">{att.filename ?? "Audio"}</span>
              <audio
                controls
                preload="none"
                className="message-audio-player"
                src={`data:${att.mimeType};base64,${att.base64}`}
              />
            </div>
          );
        }
        return (
          <div key={`att-file-${idx}`} className="message-file-chip">
            <span className="message-file-icon" aria-hidden="true">
              {att.kind === "pdf" ? "📕" : "📄"}
            </span>
            <span className="message-file-name">{att.filename ?? "File"}</span>
            {att.textContent ? (
              <pre className="message-file-preview">{att.textContent}</pre>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function MessageErrorBlock({
  message,
  onRetry
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="message-error-block" role="alert">
      <p className="message-error-text">{message}</p>
      <button type="button" className="message-action-btn message-error-retry" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

export function MessageList({
  messages,
  loading,
  streamingMessageId,
  onSuggestion
}: Props) {
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeConversation = useChatStore((s) => s.activeConversation);
  const visibleMessages = useMemo(
    () => (activeConversation ? getVisibleMessages(activeConversation) : messages),
    [activeConversation, messages]
  );
  const stickToBottomRef = useRef(true);
  const [showJumpChip, setShowJumpChip] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const toolActivity = useChatStore((s) => s.toolActivity);
  const sending = useChatStore((s) => s.sending);
  const error = useChatStore((s) => s.error);
  const retryAfterMessageId = useChatStore((s) => s.retryAfterMessageId);
  const editingMessageId = useChatStore((s) => s.editingMessageId);
  const regenerateLastResponse = useChatStore((s) => s.regenerateLastResponse);
  const forkConversation = useChatStore((s) => s.forkConversation);
  const selectBranch = useChatStore((s) => s.selectBranch);
  const editMessage = useChatStore((s) => s.editMessage);
  const retryMessage = useChatStore((s) => s.retryMessage);
  const citationsByMessageId = useChatStore((s) => s.citationsByMessageId);
  const showBookmarksOnly = useChatStore((s) => s.showBookmarksOnly);
  const setShowBookmarksOnly = useChatStore((s) => s.setShowBookmarksOnly);
  const toggleMessageBookmark = useChatStore((s) => s.toggleMessageBookmark);
  const setEditingMessageId = useChatStore((s) => s.setEditingMessageId);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
    stickToBottomRef.current = true;
    setShowJumpChip(false);
  }, []);

  const updateStickiness = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD_PX;
    stickToBottomRef.current = nearBottom;
    setShowJumpChip(!nearBottom);
  }, []);

  useEffect(() => {
    if (stickToBottomRef.current) {
      scrollToBottom(streamingMessageId ? "auto" : "smooth");
    }
  }, [visibleMessages, loading, streamingMessageId, toolActivity, scrollToBottom]);

  const visible = visibleMessages
    .filter((m) => m.role === "user" || m.role === "assistant" || m.role === "tool")
    .filter((m) => !showBookmarksOnly || m.bookmarked);

  const lastAssistantId = (() => {
    for (let i = visible.length - 1; i >= 0; i -= 1) {
      const m = visible[i];
      if (m.role === "assistant" && !m.toolCalls?.length) return m.id;
    }
    return undefined;
  })();

  if (loading && visible.length === 0) {
    return (
      <div className="messages-placeholder">
        <Skeleton rows={5} />
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="message-list-shell message-list-shell--empty">
        {showBookmarksOnly ? (
          <div className="bookmark-filter-banner">
            <span>{t.chat.bookmarked}</span>
            <button type="button" onClick={() => setShowBookmarksOnly(false)}>
              {t.chat.showAll}
            </button>
          </div>
        ) : null}
        <div className="messages-empty">
          {!showBookmarksOnly ? <BrandMark size={48} className="messages-empty-logo" /> : null}
          <p className="messages-empty-title">
            {showBookmarksOnly ? t.chat.noBookmarks : t.chat.emptyTitle}
          </p>
          {!showBookmarksOnly ? (
            <>
              <p className="messages-empty-sub">{t.chat.emptySub}</p>
              {onSuggestion ? (
                <div className="messages-empty-suggestions">
                  {t.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="messages-empty-chip"
                      onClick={() => onSuggestion(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <button
              type="button"
              className="messages-empty-chip"
              onClick={() => setShowBookmarksOnly(false)}
            >
              {t.chat.showAll}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="message-list-shell"
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget && (e.target as HTMLElement).tagName !== "BODY") {
          return;
        }
        if (e.key === "j" || e.key === "k") {
          e.preventDefault();
          setFocusedIndex((prev) => {
            if (visible.length === 0) return -1;
            if (prev < 0) return e.key === "j" ? 0 : visible.length - 1;
            if (e.key === "j") return Math.min(visible.length - 1, prev + 1);
            return Math.max(0, prev - 1);
          });
        }
      }}
      tabIndex={0}
    >
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {streamingMessageId ? t.chat.responding : ""}
      </div>
      {showBookmarksOnly ? (
        <div className="bookmark-filter-banner">
          <span>{t.chat.bookmarked}</span>
          <button type="button" onClick={() => setShowBookmarksOnly(false)}>
            {t.chat.showAll}
          </button>
        </div>
      ) : null}
      <div className="message-list" ref={listRef} onScroll={updateStickiness}>
        {visible.map((msg, index) => {
          const isStreaming = streamingMessageId === msg.id;
          const isFocused = index === focusedIndex;
          const attachments = collectAttachments(msg);
          const isEditing = editingMessageId === msg.id;
          const showRetry = !sending && retryAfterMessageId === msg.id && !!error;

          if (msg.role === "tool") {
            return (
              <div key={msg.id} className="message message-tool message-enter">
                <div className="message-role">tool · {msg.toolName ?? "result"}</div>
                <div className="message-content message-tool-content" {...autoDirProps}>
                  {msg.content}
                </div>
              </div>
            );
          }

          if (msg.role === "assistant" && msg.toolCalls?.length) {
            return (
              <div key={msg.id} className="message message-assistant message-tool-call message-enter">
                <div className="message-role">assistant · tools</div>
                {msg.toolCalls.map((tc) => (
                  <details key={tc.id} className="tool-call-block" open>
                    <summary className="tool-call-name">{tc.name}</summary>
                    <pre className="tool-call-args">{tc.arguments}</pre>
                  </details>
                ))}
                {msg.content ? (
                  <div className="message-content" {...autoDirProps}>
                    {msg.content}
                  </div>
                ) : null}
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={
                (msg.role === "user"
                  ? "message message-user message-enter"
                  : "message message-assistant message-enter") +
                (isFocused ? " message-focused" : "")
              }
            >
              <AttachmentPreview attachments={attachments} />
              {msg.role === "user" && isEditing ? (
                <MessageEditForm
                  initialContent={msg.content}
                  saving={sending}
                  onCancel={() => setEditingMessageId(null)}
                  onSave={(content) => void editMessage(msg.id, content)}
                />
              ) : msg.content ? (
                <div
                  className={
                    msg.role === "assistant"
                      ? "message-content message-content-markdown"
                      : "message-content"
                  }
                  {...autoDirProps}
                >
                  {msg.role === "assistant" ? (
                    <MessageMarkdown
                      content={msg.content}
                      citations={citationsByMessageId[msg.id]}
                    />
                  ) : (
                    msg.content
                  )}
                  {isStreaming ? (
                    <span className="streaming-cursor inline-cursor" aria-hidden="true" />
                  ) : null}
                </div>
              ) : isStreaming ? (
                <div className="message-content streaming-placeholder">
                  <span className="streaming-cursor" aria-hidden="true" />
                </div>
              ) : null}
              {msg.role === "user" && !isEditing ? (
                <UserMessageActions
                  content={msg.content}
                  canEdit={!sending}
                  editing={isEditing}
                  onEdit={() => setEditingMessageId(msg.id)}
                  onFork={() => void forkConversation(msg.id)}
                  bookmarked={msg.bookmarked}
                  onToggleBookmark={() => void toggleMessageBookmark(msg.id, !msg.bookmarked)}
                />
              ) : null}
              {msg.role === "assistant" &&
              msg.parentId &&
              activeConversation &&
              getBranchSiblings(activeConversation, msg.parentId).length > 1 ? (
                <div className="branch-picker">
                  {getBranchSiblings(activeConversation, msg.parentId).map((branch, idx) => {
                    const active =
                      activeConversation.branchPicks?.[msg.parentId!] === branch.id ||
                      (!activeConversation.branchPicks?.[msg.parentId!] &&
                        branch.id ===
                          [...getBranchSiblings(activeConversation, msg.parentId!)].sort((a, b) =>
                            a.createdAt.localeCompare(b.createdAt)
                          )[
                            getBranchSiblings(activeConversation, msg.parentId!).length - 1
                          ]?.id);
                    return (
                      <button
                        key={branch.id}
                        type="button"
                        className={active ? "branch-picker-btn active" : "branch-picker-btn"}
                        onClick={() => void selectBranch(msg.parentId!, branch.id)}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {msg.role === "assistant" && msg.content && !msg.toolCalls?.length ? (
                <MessageActions
                  content={msg.content}
                  canRegenerate={msg.id === lastAssistantId}
                  regenerating={sending && msg.id === lastAssistantId}
                  onRegenerate={() => void regenerateLastResponse(false)}
                  onRegenerateBranch={() => void regenerateLastResponse(true)}
                  bookmarked={msg.bookmarked}
                  onToggleBookmark={() => void toggleMessageBookmark(msg.id, !msg.bookmarked)}
                />
              ) : null}
              {showRetry ? (
                <MessageErrorBlock
                  message={error}
                  onRetry={() => void retryMessage(msg.id)}
                />
              ) : null}
            </div>
          );
        })}

        {toolActivity.length > 0 ? (
          <div className="tool-activity-panel">
            {toolActivity.map((item) => (
              <div
                key={item.id}
                className={
                  item.kind === "call"
                    ? "tool-activity-item tool-activity-call"
                    : "tool-activity-item tool-activity-result"
                }
              >
                <span className="tool-activity-label">
                  {item.kind === "call" ? "Calling" : "Result"}: {item.name}
                </span>
                <pre className="tool-activity-detail">{item.detail}</pre>
              </div>
            ))}
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      {showJumpChip ? (
        <button type="button" className="scroll-latest-chip" onClick={() => scrollToBottom("smooth")}>
          ↓ {t.chat.newMessages}
        </button>
      ) : null}
    </div>
  );
}
