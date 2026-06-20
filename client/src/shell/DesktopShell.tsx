import { useCallback, useEffect, useRef, useState } from "react";
import { ConversationList, type ConversationListHandle } from "../features/chat/components/ConversationList";
import { MessageList } from "../features/chat/components/MessageList";
import { Composer, type ComposerHandle } from "../features/chat/components/Composer";
import { useChatStore } from "../features/chat/store/chatStore";
import { SettingsPanel } from "../features/settings/components/SettingsPanel";
import { IconButton } from "../shared/components/IconButton";
import { useMediaQuery } from "../shared/hooks/useMediaQuery";
import type { Theme } from "../shared/lib/theme";
import { readSidebarExpanded, writeSidebarExpanded } from "../shared/lib/sidebarState";
import { HeaderMenu } from "./HeaderMenu";
import { ModelSelector } from "./ModelSelector";
import { SidebarFooter, SidebarNav } from "./SidebarNav";

type Props = {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
};

export function DesktopShell({ theme, onThemeChange }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<string | undefined>();
  const [sidebarExpanded, setSidebarExpanded] = useState(readSidebarExpanded);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const isNarrow = useMediaQuery("(max-width: 900px)");
  const conversationListRef = useRef<ConversationListHandle>(null);
  const composerRef = useRef<ComposerHandle>(null);

  const activeConversation = useChatStore((s) => s.activeConversation);
  const loadingConversation = useChatStore((s) => s.loadingConversation);
  const sending = useChatStore((s) => s.sending);
  const streamingMessageId = useChatStore((s) => s.streamingMessageId);
  const exporting = useChatStore((s) => s.exporting);
  const exportActiveConversation = useChatStore((s) => s.exportActiveConversation);
  const createConversation = useChatStore((s) => s.createConversation);
  const error = useChatStore((s) => s.error);
  const clearError = useChatStore((s) => s.clearError);

  useEffect(() => {
    if (!isNarrow) return;
    setMobileDrawerOpen(false);
  }, [isNarrow]);

  useEffect(() => {
    if (isNarrow) return;
    writeSidebarExpanded(sidebarExpanded);
  }, [sidebarExpanded, isNarrow]);

  const handleNewChat = useCallback(async () => {
    await createConversation();
    composerRef.current?.focus();
    if (isNarrow) setMobileDrawerOpen(false);
  }, [createConversation, isNarrow]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchActive(true);
        conversationListRef.current?.focusSearch();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        void handleNewChat();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleNewChat]);

  const handleSearch = () => {
    setSearchActive(true);
    conversationListRef.current?.focusSearch();
  };

  const closeMobileDrawer = () => setMobileDrawerOpen(false);
  const openMobileDrawer = () => setMobileDrawerOpen(true);
  const collapseSidebar = () => setSidebarExpanded(false);
  const expandSidebar = () => setSidebarExpanded(true);

  const shellClass = [
    "app-shell",
    isNarrow ? "app-shell--narrow" : "",
    isNarrow && mobileDrawerOpen ? "app-shell--sidebar-open" : "",
    !sidebarExpanded && !isNarrow ? "app-shell--sidebar-collapsed" : ""
  ]
    .filter(Boolean)
    .join(" ");

  const canExport = Boolean(activeConversation?.messages.length);

  return (
    <div className={shellClass}>
      {isNarrow && mobileDrawerOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close sidebar"
          onClick={closeMobileDrawer}
        />
      ) : null}

      <aside className="sidebar" aria-hidden={isNarrow && !mobileDrawerOpen}>
        <div className="sidebar-top">
          {!isNarrow ? (
            <IconButton
              className="sidebar-collapse"
              label="Collapse sidebar"
              onClick={collapseSidebar}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
              </svg>
            </IconButton>
          ) : (
            <IconButton className="sidebar-close" label="Close menu" onClick={closeMobileDrawer}>
              ×
            </IconButton>
          )}
        </div>

        <SidebarNav
          onNewChat={() => void handleNewChat()}
          onSearch={handleSearch}
          onOpenMore={() => setMoreOpen((v) => !v)}
          searchActive={searchActive}
        />

        {moreOpen ? (
          <div className="sidebar-more-panel">
            <button
              type="button"
              onClick={() => {
                setSettingsTab("personalization");
                setSettingsOpen(true);
                setMoreOpen(false);
              }}
            >
              Prompt presets
            </button>
          </div>
        ) : null}

        <div className="sidebar-recents">
          <div className="sidebar-recents-label">Recents</div>
          <ConversationList
            ref={conversationListRef}
            showSearch={searchActive}
            onNavigate={closeMobileDrawer}
          />
        </div>

        <SidebarFooter onOpenSettings={() => setSettingsOpen(true)} />
      </aside>

      <main className="main-panel">
        <header className="main-header">
          <div className="header-leading">
            {isNarrow ? (
              <IconButton className="sidebar-toggle" label="Open menu" onClick={openMobileDrawer}>
                ☰
              </IconButton>
            ) : !sidebarExpanded ? (
              <IconButton className="sidebar-expand" label="Open sidebar" onClick={expandSidebar}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
                </svg>
              </IconButton>
            ) : null}
            <ModelSelector />
          </div>
          <div className="header-actions">
            <HeaderMenu
              canExport={canExport}
              exporting={exporting}
              onExportMarkdown={() => void exportActiveConversation("markdown")}
              onExportJson={() => void exportActiveConversation("json")}
              onOpenSettings={() => setSettingsOpen(true)}
            />
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
          <div className="messages-inner">
            <MessageList
              messages={activeConversation?.messages ?? []}
              loading={loadingConversation && !sending}
              streamingMessageId={streamingMessageId}
            />
          </div>
        </section>

        <div className="composer-area">
          <div className="composer-shell">
            <Composer ref={composerRef} />
          </div>
          <p className="composer-disclaimer">
            ThatGPT runs on your hardware. It hallucinates locally — verify before deploying to prod.
          </p>
        </div>
      </main>

      <SettingsPanel
        open={settingsOpen}
        initialTab={settingsTab}
        theme={theme}
        onThemeChange={onThemeChange}
        onClose={() => {
          setSettingsOpen(false);
          setSettingsTab(undefined);
        }}
      />
    </div>
  );
}
