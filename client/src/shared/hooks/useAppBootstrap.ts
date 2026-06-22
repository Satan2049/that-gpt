import { useEffect, useRef, useState } from "react";
import { listen } from "../lib/tauriEvent";
import { applyTheme, readStoredTheme, toggleTheme, type Theme } from "../lib/theme";
import { useChatStore } from "../../features/chat/store/chatStore";
import { usePromptStore } from "../../features/prompt/store/promptStore";
import { useProviderStore } from "../../features/providers/store/providerStore";
import { useSettingsStore } from "../../features/settings/store/settingsStore";
import type { KnowledgeCitation, TokenUsage } from "../../features/settings/types/models.types";
import { notifyGenerationComplete } from "../lib/notifications";

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

type ChatUsagePayload = {
  conversationId: string;
  messageId: string;
  usage: TokenUsage;
};

type ChatCitationsPayload = {
  conversationId: string;
  messageId: string;
  citations: KnowledgeCitation[];
};

type GeneratedImagePayload = {
  conversationId: string;
  messageId: string;
  mimeType: string;
  base64: string;
};

export function useAppBootstrap() {
  const [theme, setTheme] = useState<Theme>("light");
  const loadConversations = useChatStore((s) => s.loadConversations);
  const loadPrompts = usePromptStore((s) => s.loadPrompts);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const loadProviders = useProviderStore((s) => s.loadProviders);
  const onStreamStart = useChatStore((s) => s.onStreamStart);
  const onStreamChunk = useChatStore((s) => s.onStreamChunk);
  const onStreamCancelled = useChatStore((s) => s.onStreamCancelled);
  const onToolCall = useChatStore((s) => s.onToolCall);
  const onToolResult = useChatStore((s) => s.onToolResult);
  const onChatUsage = useChatStore((s) => s.onChatUsage);
  const onChatCitations = useChatStore((s) => s.onChatCitations);
  const onGeneratedImage = useChatStore((s) => s.onGeneratedImage);
  const sending = useChatStore((s) => s.sending);
  const streamingMessageId = useChatStore((s) => s.streamingMessageId);
  const activeConversation = useChatStore((s) => s.activeConversation);

  useEffect(() => {
    const nextTheme = readStoredTheme();
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }, []);

  useEffect(() => {
    void loadConversations();
    void loadPrompts();
    void loadSettings();
    void loadProviders();
  }, [loadConversations, loadPrompts, loadSettings, loadProviders]);

  useEffect(() => {
    let unlistenStart: (() => void) | undefined;
    let unlistenChunk: (() => void) | undefined;
    let unlistenCancelled: (() => void) | undefined;
    let unlistenToolCall: (() => void) | undefined;
    let unlistenToolResult: (() => void) | undefined;
    let unlistenUsage: (() => void) | undefined;
    let unlistenCitations: (() => void) | undefined;
    let unlistenGeneratedImage: (() => void) | undefined;
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
      unlistenUsage = await listen<ChatUsagePayload>("chat-usage", (payload) => {
        if (!cancelled) onChatUsage(payload);
      });
      unlistenCitations = await listen<ChatCitationsPayload>("chat-citations", (payload) => {
        if (!cancelled) onChatCitations(payload);
      });
      unlistenGeneratedImage = await listen<GeneratedImagePayload>(
        "chat-generated-image",
        (payload) => {
          if (!cancelled) onGeneratedImage(payload);
        }
      );
    })();

    return () => {
      cancelled = true;
      unlistenStart?.();
      unlistenChunk?.();
      unlistenCancelled?.();
      unlistenToolCall?.();
      unlistenToolResult?.();
      unlistenUsage?.();
      unlistenCitations?.();
      unlistenGeneratedImage?.();
    };
  }, [
    onStreamStart,
    onStreamChunk,
    onStreamCancelled,
    onToolCall,
    onToolResult,
    onChatUsage,
    onChatCitations,
    onGeneratedImage
  ]);

  const wasGeneratingRef = useRef(false);
  useEffect(() => {
    const generating = sending || Boolean(streamingMessageId);
    if (wasGeneratingRef.current && !generating) {
      void notifyGenerationComplete(
        "ThatGPT",
        activeConversation?.title
          ? `Finished: ${activeConversation.title}`
          : "Response ready"
      );
    }
    wasGeneratingRef.current = generating;
  }, [sending, streamingMessageId, activeConversation?.title]);

  const onToggleTheme = () => {
    setTheme((current) => toggleTheme(current));
  };

  return { theme, setTheme, onToggleTheme };
}
