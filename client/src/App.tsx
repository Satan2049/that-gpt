import { useEffect, useState } from "react";
import { ConversationList } from "./features/chat/components/ConversationList";
import { MessageList } from "./features/chat/components/MessageList";
import { Composer } from "./features/chat/components/Composer";
import { useChatStore } from "./features/chat/store/chatStore";
import { PromptPresetPanel } from "./features/prompt/components/PromptPresetPanel";
import { PromptPresetSelect } from "./features/prompt/components/PromptPresetSelect";
import { usePromptStore } from "./features/prompt/store/promptStore";
import { SettingsPanel } from "./features/settings/components/SettingsPanel";
import { useSettingsStore } from "./features/settings/store/settingsStore";
import { listen } from "./shared/lib/tauriEvent";
import { applyTheme, readStoredTheme, toggleTheme, type Theme } from "./shared/lib/theme";

type StreamStartPayload = {
  conversationId: string;
  messageId: string;
};

type StreamChunkPayload = {
  conversationId: string;
  messageId: string;
  delta: string;
};

export function App() {
  const [theme, setTheme] = useState<Theme>("light");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const loadPrompts = usePromptStore((s) => s.loadPrompts);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const onStreamStart = useChatStore((s) => s.onStreamStart);
  const onStreamChunk = useChatStore((s) => s.onStreamChunk);
  const activeConversation = useChatStore((s) => s.activeConversation);
  const loadingConversation = useChatStore((s) => s.loadingConversation);
  const sending = useChatStore((s) => s.sending);
  const streamingMessageId = useChatStore((s) => s.streamingMessageId);
  const exporting = useChatStore((s) => s.exporting);
  const exportActiveConversation = useChatStore((s) => s.exportActiveConversation);
  const error = useChatStore((s) => s.error);
  const clearError = useChatStore((s) => s.clearError);

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
    let cancelled = false;

    void (async () => {
      unlistenStart = await listen<StreamStartPayload>("chat-stream-start", (payload) => {
        if (!cancelled) onStreamStart(payload);
      });
      unlistenChunk = await listen<StreamChunkPayload>("chat-stream-chunk", (payload) => {
        if (!cancelled) onStreamChunk(payload);
      });
    })();

    return () => {
      cancelled = true;
      unlistenStart?.();
      unlistenChunk?.();
    };
  }, [onStreamStart, onStreamChunk]);

  const onToggleTheme = () => {
    setTheme((current) => toggleTheme(current));
  };

  const canExport = Boolean(activeConversation?.messages.length);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="section-title">Conversations</div>
        <ConversationList />
        <div className="sidebar-divider" />
        <PromptPresetPanel />
      </aside>

      <main className="main-panel">
        <header className="main-header">
          <div className="header-title-block">
            <h1>{activeConversation?.title ?? "ChatNest"}</h1>
            <PromptPresetSelect />
          </div>
          <div className="header-actions">
            <details className="export-menu">
              <summary className={canExport ? "" : "disabled"}>Export</summary>
              <div className="export-menu-panel">
                <button
                  type="button"
                  disabled={!canExport || exporting}
                  onClick={() => void exportActiveConversation("markdown")}
                >
                  Markdown (.md)
                </button>
                <button
                  type="button"
                  disabled={!canExport || exporting}
                  onClick={() => void exportActiveConversation("json")}
                >
                  JSON (.json)
                </button>
              </div>
            </details>
            <button type="button" onClick={() => setSettingsOpen(true)}>
              Settings
            </button>
            <button type="button" onClick={onToggleTheme}>
              {theme === "light" ? "Dark mode" : "Light mode"}
            </button>
          </div>
        </header>

        {error ? (
          <div className="banner-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={clearError}>
              Dismiss
            </button>
          </div>
        ) : null}

        <section className="messages-panel">
          <MessageList
            messages={activeConversation?.messages ?? []}
            loading={loadingConversation && !sending}
            streamingMessageId={streamingMessageId}
          />
        </section>

        <Composer />
      </main>

      <SettingsPanel
        open={settingsOpen}
        theme={theme}
        onThemeChange={setTheme}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
