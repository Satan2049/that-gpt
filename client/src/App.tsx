import { useEffect, useState } from "react";
import { ConversationList } from "./features/chat/components/ConversationList";
import { MessageList } from "./features/chat/components/MessageList";
import { Composer } from "./features/chat/components/Composer";
import { useChatStore } from "./features/chat/store/chatStore";
import { PromptPresetPanel } from "./features/prompt/components/PromptPresetPanel";
import { PromptPresetSelect } from "./features/prompt/components/PromptPresetSelect";
import { usePromptStore } from "./features/prompt/store/promptStore";

type Theme = "light" | "dark";

const THEME_KEY = "chatterbox-theme";

export function App() {
  const [theme, setTheme] = useState<Theme>("light");
  const loadConversations = useChatStore((s) => s.loadConversations);
  const loadPrompts = usePromptStore((s) => s.loadPrompts);
  const activeConversation = useChatStore((s) => s.activeConversation);
  const loadingConversation = useChatStore((s) => s.loadingConversation);
  const sending = useChatStore((s) => s.sending);
  const error = useChatStore((s) => s.error);
  const clearError = useChatStore((s) => s.clearError);

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    const nextTheme = savedTheme === "dark" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    void loadPrompts();
  }, [loadPrompts]);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

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
            <h1>{activeConversation?.title ?? "Chatterbox"}</h1>
            <PromptPresetSelect />
          </div>
          <button type="button" onClick={toggleTheme}>
            {theme === "light" ? "Dark mode" : "Light mode"}
          </button>
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
            loading={loadingConversation || sending}
          />
        </section>

        <Composer />
      </main>
    </div>
  );
}
