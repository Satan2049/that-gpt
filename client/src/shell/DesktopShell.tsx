import { useCallback, useEffect, useRef, useState } from "react";
import { ConversationList, type ConversationListHandle } from "../features/chat/components/ConversationList";
import { MessageList } from "../features/chat/components/MessageList";
import { PromptPreviewModal } from "../features/chat/components/PromptPreviewModal";
import { Composer, type ComposerHandle } from "../features/chat/components/Composer";
import { TokenUsageFooter } from "../features/chat/components/TokenUsageFooter";
import { ProjectsPanel } from "../features/folders/components/ProjectsPanel";
import { ProjectWorkspace } from "../features/folders/components/ProjectWorkspace";
import { LibraryPanel } from "../features/library/components/LibraryPanel";
import { useChatStore } from "../features/chat/store/chatStore";
import { SettingsPanel } from "../features/settings/components/SettingsPanel";
import { useSettingsStore } from "../features/settings/store/settingsStore";
import { IconButton } from "../shared/components/IconButton";
import { useMediaQuery } from "../shared/hooks/useMediaQuery";
import type { Theme } from "../shared/lib/theme";
import {
  applySidebarWidth,
  readSidebarExpanded,
  readSidebarWidth,
  writeSidebarExpanded,
  writeSidebarWidth
} from "../shared/lib/sidebarState";
import { HeaderMenu } from "./HeaderMenu";
import { ModelSelector } from "./ModelSelector";
import { SearchModal } from "./SearchModal";
import { SidebarFooter, SidebarNav } from "./SidebarNav";
import { useTranslation } from "../shared/i18n/useTranslation";

type Props = {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
};

export function DesktopShell({ theme, onThemeChange }: Props) {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<string | undefined>();
  const [sidebarExpanded, setSidebarExpanded] = useState(readSidebarExpanded);
  const [sidebarWidth, setSidebarWidth] = useState(readSidebarWidth);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [promptPreviewOpen, setPromptPreviewOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const isNarrow = useMediaQuery("(max-width: 900px)");
  const conversationListRef = useRef<ConversationListHandle>(null);
  const composerRef = useRef<ComposerHandle>(null);
  const resizingRef = useRef(false);

  const activeConversation = useChatStore((s) => s.activeConversation);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const devModeEnabled = useSettingsStore((s) => s.settings?.devModeEnabled ?? false);
  const sidebarPanel = useChatStore((s) => s.sidebarPanel);
  const loadingConversation = useChatStore((s) => s.loadingConversation);
  const sending = useChatStore((s) => s.sending);
  const streamingMessageId = useChatStore((s) => s.streamingMessageId);
  const exporting = useChatStore((s) => s.exporting);
  const exportActiveConversation = useChatStore((s) => s.exportActiveConversation);
  const copyConversationMarkdown = useChatStore((s) => s.copyConversationMarkdown);
  const createConversation = useChatStore((s) => s.createConversation);
  const burnActiveEphemeral = useChatStore((s) => s.burnActiveEphemeral);
  const setSidebarPanel = useChatStore((s) => s.setSidebarPanel);
  const showBookmarksOnly = useChatStore((s) => s.showBookmarksOnly);
  const setShowBookmarksOnly = useChatStore((s) => s.setShowBookmarksOnly);
  const selectedFolderId = useChatStore((s) => s.selectedFolderId);
  const loadFolders = useChatStore((s) => s.loadFolders);
  const error = useChatStore((s) => s.error);
  const clearError = useChatStore((s) => s.clearError);

  const isEphemeral = Boolean(activeConversation?.ephemeral);
  const isLibraryView = sidebarPanel === "library";
  const isProjectsView = sidebarPanel === "projects";
  const isProjectHome = isProjectsView && Boolean(selectedFolderId);
  const showChat = !isLibraryView && !isProjectsView;

  useEffect(() => {
    applySidebarWidth(sidebarWidth);
  }, [sidebarWidth]);

  useEffect(() => {
    void loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    if (!isNarrow) return;
    setMobileDrawerOpen(false);
  }, [isNarrow]);

  useEffect(() => {
    if (isNarrow) return;
    writeSidebarExpanded(sidebarExpanded);
  }, [sidebarExpanded, isNarrow]);

  const handleNewChat = useCallback(async () => {
    await setSidebarPanel("chats");
    await createConversation();
    composerRef.current?.focus();
    if (isNarrow) setMobileDrawerOpen(false);
  }, [createConversation, isNarrow, setSidebarPanel]);

  const handleTemporaryChat = useCallback(async () => {
    await setSidebarPanel("chats");
    await createConversation({ ephemeral: true });
    composerRef.current?.focus();
    if (isNarrow) setMobileDrawerOpen(false);
  }, [createConversation, isNarrow]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchModalOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        void handleNewChat();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === ";") {
        e.preventDefault();
        setSettingsOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleNewChat]);

  const onResizeStart = (e: React.PointerEvent) => {
    if (isNarrow) return;
    e.preventDefault();
    resizingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onResizeMove = (e: React.PointerEvent) => {
    if (!resizingRef.current) return;
    const next = Math.round(e.clientX);
    setSidebarWidth(next);
  };

  const onResizeEnd = (e: React.PointerEvent) => {
    if (!resizingRef.current) return;
    resizingRef.current = false;
    const next = Math.round(e.clientX);
    setSidebarWidth(next);
    writeSidebarWidth(next);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
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
          aria-label={t.shell.closeSidebar}
          onClick={closeMobileDrawer}
        />
      ) : null}

      <aside className="sidebar" aria-hidden={isNarrow && !mobileDrawerOpen}>
        <div className="sidebar-top">
          {!isNarrow ? (
            <IconButton
              className="sidebar-collapse"
              label={t.shell.collapseSidebar}
              onClick={collapseSidebar}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
              </svg>
            </IconButton>
          ) : (
            <IconButton className="sidebar-close" label={t.shell.closeMenu} onClick={closeMobileDrawer}>
              ×
            </IconButton>
          )}
        </div>

        <SidebarNav
          onNewChat={() => void handleNewChat()}
          onSearch={() => setSearchModalOpen(true)}
          onOpenLibrary={() => void setSidebarPanel("library")}
          onOpenProjects={() => void setSidebarPanel("projects")}
          onOpenMore={() => setMoreOpen((v) => !v)}
          activePanel={sidebarPanel}
        />

        {moreOpen ? (
          <div className="sidebar-more-panel">
            <button
              type="button"
              onClick={() => {
                void setSidebarPanel("chats");
                setShowBookmarksOnly(!showBookmarksOnly);
                setMoreOpen(false);
              }}
            >
              {showBookmarksOnly ? t.chat.showAll : t.chat.bookmarks}
            </button>
            <button
              type="button"
              onClick={() => {
                void handleTemporaryChat();
                setMoreOpen(false);
              }}
            >
              {t.nav.temporaryChat}
            </button>
            <button
              type="button"
              onClick={() => {
                void setSidebarPanel("archived");
                setMoreOpen(false);
              }}
            >
              {t.nav.archivedChats}
            </button>
            <button
              type="button"
              onClick={() => {
                setSettingsTab("personalization");
                setSettingsOpen(true);
                setMoreOpen(false);
              }}
            >
              {t.nav.promptPresets}
            </button>
          </div>
        ) : null}

        <div className="sidebar-recents">
          {sidebarPanel === "projects" ? (
            <ProjectsPanel />
          ) : sidebarPanel === "library" ? (
            <p className="sidebar-placeholder">{t.nav.attachmentsHint}</p>
          ) : (
            <>
              <div className="sidebar-recents-label">
                {sidebarPanel === "archived" ? t.nav.archived : t.nav.recents}
              </div>
              <ConversationList ref={conversationListRef} onNavigate={closeMobileDrawer} />
            </>
          )}
        </div>

        <SidebarFooter onOpenSettings={() => setSettingsOpen(true)} />

        {!isNarrow ? (
          <div
            className="sidebar-resize-handle"
            role="separator"
            aria-orientation="vertical"
            aria-label={t.shell.resizeSidebar}
            onPointerDown={onResizeStart}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeEnd}
            onPointerCancel={onResizeEnd}
          />
        ) : null}
      </aside>

      <main className="main-panel">
        <header className="main-header">
          <div className="header-leading">
            {isNarrow ? (
              <IconButton className="sidebar-toggle" label={t.shell.openMenu} onClick={openMobileDrawer}>
                ☰
              </IconButton>
            ) : !sidebarExpanded ? (
              <IconButton className="sidebar-expand" label={t.shell.expandSidebar} onClick={expandSidebar}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
                </svg>
              </IconButton>
            ) : null}
            <ModelSelector />
            {isEphemeral ? (
              <span className="ephemeral-badge" title={t.chat.ephemeralHint}>
                {t.chat.temporary}
              </span>
            ) : null}
          </div>
          <div className="header-actions">
            {isEphemeral ? (
              <button type="button" className="ephemeral-burn-btn" onClick={() => void burnActiveEphemeral()}>
                {t.chat.burnIt}
              </button>
            ) : null}
            <HeaderMenu
              canExport={canExport}
              exporting={exporting}
              onExportMarkdown={() => void exportActiveConversation("markdown")}
              onExportJson={() => void exportActiveConversation("json")}
              onExportHtml={() => void exportActiveConversation("html")}
              onCopyMarkdown={() => void copyConversationMarkdown()}
              onOpenSettings={() => setSettingsOpen(true)}
              onPreviewPrompt={
                devModeEnabled ? () => setPromptPreviewOpen(true) : undefined
              }
            />
          </div>
        </header>

        {error && !isLibraryView ? (
          <div className="banner-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={clearError}>
              Dismiss
            </button>
          </div>
        ) : null}

        {isLibraryView ? (
          <section className="library-main">
            <LibraryPanel />
          </section>
        ) : isProjectHome && selectedFolderId ? (
          <ProjectWorkspace folderId={selectedFolderId} composerRef={composerRef} />
        ) : isProjectsView && !selectedFolderId ? (
          <div className="project-workspace project-workspace--pick">
            <p className="project-empty-title">Projects</p>
            <p className="project-empty-sub">Select a project in the sidebar or create a new one.</p>
          </div>
        ) : isProjectHome ? (
          <div className="project-workspace project-workspace--pick">
            <p className="project-empty-title">Select a project</p>
            <p className="project-empty-sub">Choose a project in the sidebar or create a new one.</p>
          </div>
        ) : (
          <div className="chat-main-layout">
        <section className="messages-panel">
          <div className="messages-inner">
            {isEphemeral && !activeConversation?.messages.length ? (
              <div className="messages-empty messages-empty--ephemeral">
                <p className="messages-empty-title">Temporary chat</p>
                <p className="messages-empty-sub">
                  Nothing is written to disk. Close the tab of your conscience and ask away.
                </p>
              </div>
            ) : (
              <MessageList
                messages={activeConversation?.messages ?? []}
                loading={loadingConversation && !sending}
                streamingMessageId={streamingMessageId}
                onSuggestion={(text) => {
                  composerRef.current?.setDraft(text);
                  composerRef.current?.focus();
                }}
              />
            )}
          </div>
        </section>

        <div className="composer-area">
          <TokenUsageFooter />
          <div className="composer-shell">
            <Composer ref={composerRef} />
          </div>
          <p className="composer-disclaimer">
            {isEphemeral
              ? "Ephemeral mode — this thread vanishes when you burn it or quit the app."
              : "ThatGPT runs on your hardware. It hallucinates locally — verify before deploying to prod."}
          </p>
        </div>
          </div>
        )}
      </main>

      <SearchModal
        open={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onOpenSettings={() => {
          setSearchModalOpen(false);
          setSettingsOpen(true);
        }}
        onNewChat={() => void handleNewChat()}
        theme={theme}
        onThemeChange={onThemeChange}
      />

      <PromptPreviewModal
        open={promptPreviewOpen}
        conversationId={activeConversationId}
        onClose={() => setPromptPreviewOpen(false)}
      />

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
