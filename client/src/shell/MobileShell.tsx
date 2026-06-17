import { useState } from "react";
import { ConversationList } from "../features/chat/components/ConversationList";
import { MessageList } from "../features/chat/components/MessageList";
import { Composer } from "../features/chat/components/Composer";
import { useChatStore } from "../features/chat/store/chatStore";
import { PromptPresetPanel } from "../features/prompt/components/PromptPresetPanel";
import { PromptPresetSelect } from "../features/prompt/components/PromptPresetSelect";
import { SettingsPanel } from "../features/settings/components/SettingsPanel";
import { BrandMark } from "../shared/components/BrandMark";
import { IconButton } from "../shared/components/IconButton";
import type { Theme } from "../shared/lib/theme";

type MobileTab = "chat" | "presets";

type Props = {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onToggleTheme: () => void;
};

export function MobileShell({ theme, onThemeChange, onToggleTheme }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MobileTab>("chat");

  const activeConversation = useChatStore((s) => s.activeConversation);
  const loadingConversation = useChatStore((s) => s.loadingConversation);
  const sending = useChatStore((s) => s.sending);
  const streamingMessageId = useChatStore((s) => s.streamingMessageId);
  const createConversation = useChatStore((s) => s.createConversation);
  const error = useChatStore((s) => s.error);
  const clearError = useChatStore((s) => s.clearError);

  const closeDrawer = () => setDrawerOpen(false);
  const openDrawer = () => setDrawerOpen(true);

  const handleNewChat = () => {
    void createConversation();
    setActiveTab("chat");
    closeDrawer();
  };

  return (
    <div className="mobile-shell">
      <header className="mobile-topbar">
        <IconButton label="Conversations" onClick={openDrawer}>
          ☰
        </IconButton>
        <div className="mobile-topbar-title">
          <BrandMark size={28} />
          <div className="mobile-topbar-text">
            <span className="mobile-topbar-name">
              {activeTab === "chat"
                ? (activeConversation?.title ?? "ChatNest")
                : "Presets"}
            </span>
            {activeTab === "chat" ? <PromptPresetSelect /> : null}
          </div>
        </div>
        <IconButton label="Settings" onClick={() => setSettingsOpen(true)}>
          ⚙
        </IconButton>
      </header>

      {drawerOpen ? (
        <button
          type="button"
          className="mobile-drawer-backdrop"
          aria-label="Close conversations"
          onClick={closeDrawer}
        />
      ) : null}

      <aside className={drawerOpen ? "mobile-drawer mobile-drawer-open" : "mobile-drawer"}>
        <div className="mobile-drawer-header">
          <span className="mobile-drawer-title">Conversations</span>
          <IconButton label="Close" onClick={closeDrawer}>
            ×
          </IconButton>
        </div>
        <ConversationList onNavigate={closeDrawer} />
      </aside>

      {error ? (
        <div className="mobile-banner-error banner-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={clearError}>
            Dismiss
          </button>
        </div>
      ) : null}

      <main className="mobile-main">
        {activeTab === "chat" ? (
          <>
            <section className="mobile-messages messages-panel">
              <MessageList
                messages={activeConversation?.messages ?? []}
                loading={loadingConversation && !sending}
                streamingMessageId={streamingMessageId}
              />
            </section>
            <div className="mobile-composer composer-shell">
              <Composer />
            </div>
          </>
        ) : (
          <section className="mobile-presets-panel">
            <PromptPresetPanel />
          </section>
        )}
      </main>

      <nav className="mobile-tabbar" aria-label="Main navigation">
        <button
          type="button"
          className={activeTab === "chat" ? "mobile-tab active" : "mobile-tab"}
          onClick={() => setActiveTab("chat")}
        >
          <span className="mobile-tab-icon" aria-hidden="true">
            💬
          </span>
          <span className="mobile-tab-label">Chat</span>
        </button>
        <button type="button" className="mobile-tab mobile-tab-new" onClick={handleNewChat}>
          <span className="mobile-tab-icon" aria-hidden="true">
            ＋
          </span>
          <span className="mobile-tab-label">New</span>
        </button>
        <button
          type="button"
          className={activeTab === "presets" ? "mobile-tab active" : "mobile-tab"}
          onClick={() => setActiveTab("presets")}
        >
          <span className="mobile-tab-icon" aria-hidden="true">
            ✦
          </span>
          <span className="mobile-tab-label">Presets</span>
        </button>
        <button type="button" className="mobile-tab" onClick={onToggleTheme}>
          <span className="mobile-tab-icon" aria-hidden="true">
            {theme === "light" ? "🌙" : "☀️"}
          </span>
          <span className="mobile-tab-label">Theme</span>
        </button>
      </nav>

      <SettingsPanel
        open={settingsOpen}
        theme={theme}
        onThemeChange={onThemeChange}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
