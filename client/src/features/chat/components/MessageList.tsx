import { useEffect, useRef, useState } from "react";
import type { ChatAttachment, ChatMessage } from "../types/chat.types";
import { MessageMarkdown } from "./MessageMarkdown";
import { MessageActions } from "./MessageActions";
import { useChatStore } from "../store/chatStore";

type Props = {
  messages: ChatMessage[];
  loading: boolean;
  streamingMessageId?: string | null;
};

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

export function MessageList({ messages, loading, streamingMessageId }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const toolActivity = useChatStore((s) => s.toolActivity);
  const sending = useChatStore((s) => s.sending);
  const regenerateLastResponse = useChatStore((s) => s.regenerateLastResponse);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, streamingMessageId, toolActivity]);

  const visible = messages.filter(
    (m) => m.role === "user" || m.role === "assistant" || m.role === "tool"
  );

  const lastAssistantId = (() => {
    for (let i = visible.length - 1; i >= 0; i -= 1) {
      const m = visible[i];
      if (m.role === "assistant" && !m.toolCalls?.length) return m.id;
    }
    return undefined;
  })();

  if (loading && visible.length === 0) {
    return <div className="messages-placeholder">Loading messages…</div>;
  }

  if (visible.length === 0) {
    return (
      <div className="messages-placeholder">
        Send a message to start this conversation.
      </div>
    );
  }

  return (
    <div className="message-list">
      {visible.map((msg) => {
        const isStreaming = streamingMessageId === msg.id;
        const attachments = collectAttachments(msg);

        if (msg.role === "tool") {
          return (
            <div key={msg.id} className="message message-tool">
              <div className="message-role">tool · {msg.toolName ?? "result"}</div>
              <div className="message-content message-tool-content">{msg.content}</div>
            </div>
          );
        }

        if (msg.role === "assistant" && msg.toolCalls?.length) {
          return (
            <div key={msg.id} className="message message-assistant message-tool-call">
              <div className="message-role">assistant · tools</div>
              {msg.toolCalls.map((tc) => (
                <div key={tc.id} className="tool-call-block">
                  <div className="tool-call-name">{tc.name}</div>
                  <pre className="tool-call-args">{tc.arguments}</pre>
                </div>
              ))}
              {msg.content ? <div className="message-content">{msg.content}</div> : null}
            </div>
          );
        }

        return (
          <div
            key={msg.id}
            className={msg.role === "user" ? "message message-user" : "message message-assistant"}
          >
            <div className="message-role">{msg.role}</div>
            <AttachmentPreview attachments={attachments} />
            {msg.content ? (
              <div
                className={
                  msg.role === "assistant"
                    ? "message-content message-content-markdown"
                    : "message-content"
                }
              >
                {msg.role === "assistant" ? (
                  <MessageMarkdown content={msg.content} />
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
            {msg.role === "assistant" && msg.content && !msg.toolCalls?.length ? (
              <MessageActions
                content={msg.content}
                canRegenerate={msg.id === lastAssistantId}
                regenerating={sending && msg.id === lastAssistantId}
                onRegenerate={() => void regenerateLastResponse()}
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
  );
}
