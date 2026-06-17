import { useEffect, useState } from "react";
import { listen } from "../lib/tauriEvent";
import { applyTheme, readStoredTheme, toggleTheme, type Theme } from "../lib/theme";
import { useChatStore } from "../../features/chat/store/chatStore";
import { usePromptStore } from "../../features/prompt/store/promptStore";
import { useSettingsStore } from "../../features/settings/store/settingsStore";

type StreamStartPayload = {
  conversationId: string;
  messageId: string;
};

type StreamChunkPayload = {
  conversationId: string;
  messageId: string;
  delta: string;
};

type StreamCancelledPayload = {
  conversationId: string;
  messageId: string;
};

type ToolCallPayload = {
  conversationId: string;
  toolCallId: string;
  name: string;
  arguments: string;
};

type ToolResultPayload = {
  conversationId: string;
  toolCallId: string;
  name: string;
  content: string;
};

export function useAppBootstrap() {
  const [theme, setTheme] = useState<Theme>("light");
  const loadConversations = useChatStore((s) => s.loadConversations);
  const loadPrompts = usePromptStore((s) => s.loadPrompts);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const onStreamStart = useChatStore((s) => s.onStreamStart);
  const onStreamChunk = useChatStore((s) => s.onStreamChunk);
  const onStreamCancelled = useChatStore((s) => s.onStreamCancelled);
  const onToolCall = useChatStore((s) => s.onToolCall);
  const onToolResult = useChatStore((s) => s.onToolResult);

  useEffect(() => {
    const nextTheme = readStoredTheme();
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }, []);

  useEffect(() => {
    void loadConversations();
    void loadPrompts();
    void loadSettings();
  }, [loadConversations, loadPrompts, loadSettings]);

  useEffect(() => {
    let unlistenStart: (() => void) | undefined;
    let unlistenChunk: (() => void) | undefined;
    let unlistenCancelled: (() => void) | undefined;
    let unlistenToolCall: (() => void) | undefined;
    let unlistenToolResult: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      unlistenStart = await listen<StreamStartPayload>("chat-stream-start", (payload) => {
        if (!cancelled) onStreamStart(payload);
      });
      unlistenChunk = await listen<StreamChunkPayload>("chat-stream-chunk", (payload) => {
        if (!cancelled) onStreamChunk(payload);
      });
      unlistenCancelled = await listen<StreamCancelledPayload>(
        "chat-stream-cancelled",
        (payload) => {
          if (!cancelled) onStreamCancelled(payload);
        }
      );
      unlistenToolCall = await listen<ToolCallPayload>("chat-tool-call", (payload) => {
        if (!cancelled) onToolCall(payload);
      });
      unlistenToolResult = await listen<ToolResultPayload>("chat-tool-result", (payload) => {
        if (!cancelled) onToolResult(payload);
      });
    })();

    return () => {
      cancelled = true;
      unlistenStart?.();
      unlistenChunk?.();
      unlistenCancelled?.();
      unlistenToolCall?.();
      unlistenToolResult?.();
    };
  }, [onStreamStart, onStreamChunk, onStreamCancelled, onToolCall, onToolResult]);

  const onToggleTheme = () => {
    setTheme((current) => toggleTheme(current));
  };

  return { theme, setTheme, onToggleTheme };
}
