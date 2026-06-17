import { useEffect, useState } from "react";
import { ConversationList } from "../features/chat/components/ConversationList";
import { MessageList } from "../features/chat/components/MessageList";
import { Composer } from "../features/chat/components/Composer";
import { useChatStore } from "../features/chat/store/chatStore";
import { PromptPresetPanel } from "../features/prompt/components/PromptPresetPanel";
import { PromptPresetSelect } from "../features/prompt/components/PromptPresetSelect";
import { SettingsPanel } from "../features/settings/components/SettingsPanel";
import { BrandMark } from "../shared/components/BrandMark";
import { IconButton } from "../shared/components/IconButton";
import { useMediaQuery } from "../shared/hooks/useMediaQuery";
import type { Theme } from "../shared/lib/theme";

type Props = {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onToggleTheme: () => void;
};

export function DesktopShell({ theme, onThemeChange, onToggleTheme }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isNarrow = useMediaQuery("(max-width: 900px)");

  const activeConversation = useChatStore((s) => s.activeConversation);
  const loadingConversation = useChatStore((s) => s.loadingConversation);
  const sending = useChatStore((s) => s.sending);
  const streamingMessageId = useChatStore((s) => s.streamingMessageId);
  const exporting = useChatStore((s) => s.exporting);
  const exportActiveConversation = useChatStore((s) => s.exportActiveConversation);
  const error = useChatStore((s) => s.error);
  const clearError = useChatStore((s) => s.clearError);

  useEffect(() => {
    if (!isNarrow) setSidebarOpen(false);
  }, [isNarrow]);

  const closeSidebar = () => setSidebarOpen(false);
  const openSidebar = () => setSidebarOpen(true);

  const shellClass = [
    "app-shell",
    isNarrow ? "app-shell--narrow" : "",
    isNarrow && sidebarOpen ? "app-shell--sidebar-open" : ""
  ]
    .filter(Boolean)
    .join(" ");

  const canExport = Boolean(activeConversation?.messages.length);

  return (
    <div className={shellClass}>
      {isNarrow && sidebarOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close sidebar"
          onClick={closeSidebar}
        />
      ) : null}

      <aside className="sidebar" aria-hidden={isNarrow && !sidebarOpen}>
        <div className="sidebar-brand">
          <BrandMark size={40} />
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">ChatNest</span>
            <span className="sidebar-brand-tag">v2</span>
          </div>
          {isNarrow ? (
            <IconButton className="sidebar-close" label="Close menu" onClick={closeSidebar}>
              ×
            </IconButton>
          ) : null}
        </div>

        <div className="section-title">Conversations</div>
        <ConversationList onNavigate={closeSidebar} />
        <div className="sidebar-divider" />
        <PromptPresetPanel />
      </aside>

      <main className="main-panel">
        <header className="main-header">
          <div className="header-leading">
            {isNarrow ? (
              <IconButton className="sidebar-toggle" label="Open menu" onClick={openSidebar}>
                ☰
              </IconButton>
            ) : null}
            <div className="header-title-block">
              <h1>{activeConversation?.title ?? "New conversation"}</h1>
              <PromptPresetSelect />
            </div>
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
            <IconButton label="Toggle theme" onClick={onToggleTheme}>
              {theme === "light" ? "🌙" : "☀️"}
            </IconButton>
            <button type="button" onClick={() => setSettingsOpen(true)}>
              Settings
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

        <div className="composer-shell">
          <Composer />
        </div>
      </main>

      <SettingsPanel
        open={settingsOpen}
        theme={theme}
        onThemeChange={onThemeChange}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
