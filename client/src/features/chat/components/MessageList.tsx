import { useEffect, useRef } from "react";
import type { ChatMessage } from "../types/chat.types";

type Props = {
  messages: ChatMessage[];
  loading: boolean;
};

export function MessageList({ messages, loading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const visible = messages.filter((m) => m.role === "user" || m.role === "assistant");

  if (loading && visible.length === 0) {
    return (
      <div className="messages-placeholder">Loading messages…</div>
    );
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
      {visible.map((msg) => (
        <div
          key={msg.id}
          className={msg.role === "user" ? "message message-user" : "message message-assistant"}
        >
          <div className="message-role">{msg.role}</div>
          {msg.images?.length ? (
            <div className="message-images">
              {msg.images.map((img, idx) => (
                <img
                  key={`${msg.id}-img-${idx}`}
                  src={`data:${img.mimeType};base64,${img.base64}`}
                  alt="Attached"
                  className="message-image-thumb"
                />
              ))}
            </div>
          ) : null}
          {msg.content ? <div className="message-content">{msg.content}</div> : null}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
