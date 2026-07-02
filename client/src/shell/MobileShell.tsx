import { useCallback, useEffect, useRef, useState } from "react";
import { ConversationList } from "../features/chat/components/ConversationList";
import { MessageList } from "../features/chat/components/MessageList";
import { PromptPreviewModal } from "../features/chat/components/PromptPreviewModal";
import { Composer, type ComposerHandle } from "../features/chat/components/Composer";
import { ProjectsPanel } from "../features/folders/components/ProjectsPanel";
import { ProjectWorkspace } from "../features/folders/components/ProjectWorkspace";
import { LibraryPanel } from "../features/library/components/LibraryPanel";
import { useChatStore } from "../features/chat/store/chatStore";
import { SettingsPanel } from "../features/settings/components/SettingsPanel";
import { useSettingsStore } from "../features/settings/store/settingsStore";
import { BrandMark } from "../shared/components/BrandMark";
import { IconButton } from "../shared/components/IconButton";
import { useAndroidBackNavigation } from "../shared/hooks/useAndroidBackNavigation";
import type { Theme } from "../shared/lib/theme";
import { registerMobileBackHandler } from "../shared/lib/mobileBackStack";
import { HeaderMenu } from "./HeaderMenu";
import { MobileHomeNav } from "./MobileHomeNav";
import { ModelSelector } from "./ModelSelector";
import { SearchModal } from "./SearchModal";
import { SidebarFooter } from "./SidebarNav";
import { useTranslation } from "../shared/i18n/useTranslation";

type MobileScreen = "home" | "thread" | "library" | "projects" | "workspace" | "more";

type Props = {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
};

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MobileShell({ theme, onThemeChange }: Props) {
  const { t } = useTranslation();
  const [screen, setScreen] = useState<MobileScreen>("home");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<string | undefined>();
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [promptPreviewOpen, setPromptPreviewOpen] = useState(false);
  const composerRef = useRef<ComposerHandle>(null);

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
  const createConversationInFolder = useChatStore((s) => s.createConversationInFolder);
  const selectConversation = useChatStore((s) => s.selectConversation);
  const burnActiveEphemeral = useChatStore((s) => s.burnActiveEphemeral);
  const setSidebarPanel = useChatStore((s) => s.setSidebarPanel);
  const showBookmarksOnly = useChatStore((s) => s.showBookmarksOnly);
  const setShowBookmarksOnly = useChatStore((s) => s.setShowBookmarksOnly);
  const selectedFolderId = useChatStore((s) => s.selectedFolderId);
  const setSelectedFolderId = useChatStore((s) => s.setSelectedFolderId);
  const loadFolders = useChatStore((s) => s.loadFolders);
  const error = useChatStore((s) => s.error);
  const clearError = useChatStore((s) => s.clearError);

  const isEphemeral = Boolean(activeConversation?.ephemeral);
  const isArchivedList = sidebarPanel === "archived";
  const showDock = screen === "home";
  const canExport = Boolean(activeConversation?.messages.length);

  useEffect(() => {
    void loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    if (selectedFolderId && screen === "projects") {
      setScreen("workspace");
    }
  }, [screen, selectedFolderId]);

  const goHome = useCallback(() => {
    setScreen("home");
  }, []);

  const handleNewChat = useCallback(async () => {
    await setSidebarPanel("chats");
    await createConversation();
    setScreen("thread");
    composerRef.current?.focus();
  }, [createConversation, setSidebarPanel]);

  const handleTemporaryChat = useCallback(async () => {
    await setSidebarPanel("chats");
    await createConversation({ ephemeral: true });
    setScreen("thread");
    composerRef.current?.focus();
  }, [createConversation, setSidebarPanel]);

  const openConversationThread = useCallback(() => {
    setScreen("thread");
    composerRef.current?.focus();
  }, []);

  const navigateToChatThread = useCallback(
    async (conversationId?: string) => {
      if (conversationId) {
        await selectConversation(conversationId);
      }
      await setSidebarPanel("chats");
      setScreen("thread");
      composerRef.current?.focus();
    },
    [selectConversation, setSidebarPanel]
  );

  const handleProjectNewChat = useCallback(async () => {
    if (!selectedFolderId) return;
    await createConversationInFolder(selectedFolderId);
    await navigateToChatThread();
  }, [createConversationInFolder, navigateToChatThread, selectedFolderId]);

  const handleProjectOpenChat = useCallback(
    async (id: string) => {
      await navigateToChatThread(id);
    },
    [navigateToChatThread]
  );

  const handleLibraryOpenConversation = useCallback(
    (conversationId: string) => {
      void navigateToChatThread(conversationId);
    },
    [navigateToChatThread]
  );

  const handleAndroidBack = useCallback(() => {
    if (settingsOpen) {
      setSettingsOpen(false);
      setSettingsTab(undefined);
      return true;
    }
    if (searchModalOpen) {
      setSearchModalOpen(false);
      return true;
    }
    if (promptPreviewOpen) {
      setPromptPreviewOpen(false);
      return true;
    }
    if (screen === "thread") {
      goHome();
      return true;
    }
    if (screen === "workspace") {
      setSelectedFolderId(null);
      setScreen("projects");
      return true;
    }
    if (screen !== "home") {
      goHome();
      return true;
    }
    return false;
  }, [goHome, promptPreviewOpen, screen, searchModalOpen, setSelectedFolderId, settingsOpen]);

  useAndroidBackNavigation(handleAndroidBack, true);

  useEffect(() => {
    if (!settingsOpen) return;
    return registerMobileBackHandler(() => {
      setSettingsOpen(false);
      setSettingsTab(undefined);
      return true;
    });
  }, [settingsOpen]);

  useEffect(() => {
    if (!searchModalOpen) return;
    return registerMobileBackHandler(() => {
      setSearchModalOpen(false);
      return true;
    });
  }, [searchModalOpen]);

  useEffect(() => {
    if (!promptPreviewOpen) return;
    return registerMobileBackHandler(() => {
      setPromptPreviewOpen(false);
      return true;
    });
  }, [promptPreviewOpen]);

  const screenTitle =
    screen === "library"
      ? t.nav.library
      : screen === "projects" || screen === "workspace"
        ? t.projects.title
        : screen === "more"
          ? t.nav.more
          : isArchivedList
            ? t.nav.archived
            : t.titleBar.appName;

  const shellClass = [
    "mobile-shell",
    screen === "thread" ? "mobile-shell--thread" : "",
    screen === "workspace" ? "mobile-shell--project-workspace" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClass}>
      <header className="mobile-topbar">
        {screen === "home" ? (
          <>
            <div className="mobile-home-brand">
              <BrandMark size={28} />
              <span className="mobile-home-brand-name">{t.titleBar.appName}</span>
            </div>
            <div className="mobile-topbar-actions">
              <IconButton label={t.nav.searchChats} onClick={() => setSearchModalOpen(true)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3-3" strokeLinecap="round" />
                </svg>
              </IconButton>
            </div>
          </>
        ) : screen === "thread" ? (
          <>
            <IconButton label={t.mobile.backToChats} onClick={goHome}>
              <BackIcon />
            </IconButton>
            <div className="mobile-topbar-text">
              <ModelSelector />
              {isEphemeral ? (
                <span className="ephemeral-badge" title={t.chat.ephemeralHint}>
                  {t.chat.temporary}
                </span>
              ) : null}
            </div>
            <div className="mobile-topbar-actions">
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
                onPreviewPrompt={devModeEnabled ? () => setPromptPreviewOpen(true) : undefined}
              />
            </div>
          </>
        ) : (
          <>
            <IconButton label={t.mobile.backToChats} onClick={goHome}>
              <BackIcon />
            </IconButton>
            <span className="mobile-topbar-name">{screenTitle}</span>
          </>
        )}
      </header>

      {error && screen === "thread" ? (
        <div className="mobile-banner-error banner-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={clearError}>
            {t.common.close}
          </button>
        </div>
      ) : null}

      <main className="mobile-main">
        {screen === "home" ? (
          <div className="mobile-home">
            <MobileHomeNav
              onOpenLibrary={() => setScreen("library")}
              onOpenProjects={() => setScreen("projects")}
              onOpenMore={() => setScreen("more")}
            />
            <div className="mobile-home-recents">
              <div className="mobile-home-recents-label">{isArchivedList ? t.nav.archived : t.nav.recents}</div>
              <ConversationList onNavigate={openConversationThread} showSearch={false} />
            </div>
          </div>
        ) : screen === "thread" ? (
          <>
            <section className="mobile-messages messages-panel">
              <div className="messages-inner">
                {isEphemeral && !activeConversation?.messages.length ? (
                  <div className="messages-empty messages-empty--ephemeral">
                    <p className="messages-empty-title">{t.chat.temporary}</p>
                    <p className="messages-empty-sub">{t.chat.ephemeralHint}</p>
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
            <div className="mobile-composer-area composer-area">
              <div className="composer-shell mobile-composer-shell">
                <Composer ref={composerRef} />
              </div>
            </div>
          </>
        ) : screen === "projects" ? (
          <div className="mobile-panel">
            <div className="mobile-projects-panel">
              <ProjectsPanel />
            </div>
          </div>
        ) : screen === "workspace" && selectedFolderId ? (
          <ProjectWorkspace
            folderId={selectedFolderId}
            composerRef={composerRef}
            compact
            onNewChat={() => void handleProjectNewChat()}
            onOpenChat={(id) => void handleProjectOpenChat(id)}
          />
        ) : screen === "library" ? (
          <div className="mobile-panel mobile-library-panel">
            <LibraryPanel onOpenConversation={handleLibraryOpenConversation} />
          </div>
        ) : (
          <div className="mobile-panel mobile-more-panel">
            <div className="mobile-more-status">
              <SidebarFooter onOpenSettings={() => setSettingsOpen(true)} />
            </div>
            <div className="mobile-more-list">
              <button
                type="button"
                className="mobile-more-item"
                onClick={() => {
                  setShowBookmarksOnly(!showBookmarksOnly);
                  void setSidebarPanel("chats");
                  goHome();
                }}
              >
                <span className="mobile-more-item-icon" aria-hidden="true">
                  ★
                </span>
                {showBookmarksOnly ? t.chat.showAll : t.chat.bookmarks}
              </button>
              <button type="button" className="mobile-more-item" onClick={() => void handleTemporaryChat()}>
                <span className="mobile-more-item-icon" aria-hidden="true">
                  ⚡
                </span>
                {t.nav.temporaryChat}
              </button>
              <button
                type="button"
                className="mobile-more-item"
                onClick={() => {
                  void setSidebarPanel("archived");
                  goHome();
                }}
              >
                <span className="mobile-more-item-icon" aria-hidden="true">
                  📦
                </span>
                {t.nav.archivedChats}
              </button>
              <button
                type="button"
                className="mobile-more-item"
                onClick={() => {
                  setSettingsTab("personalization");
                  setSettingsOpen(true);
                }}
              >
                <span className="mobile-more-item-icon" aria-hidden="true">
                  ✦
                </span>
                {t.nav.promptPresets}
              </button>
              <button type="button" className="mobile-more-item" onClick={() => setSettingsOpen(true)}>
                <span className="mobile-more-item-icon" aria-hidden="true">
                  ⚙
                </span>
                {t.header.settings}
              </button>
            </div>
          </div>
        )}
      </main>

      {showDock ? (
        <footer className="mobile-dock" aria-label={t.mobile.tabNavigation}>
          <button type="button" className="mobile-dock-chat" onClick={() => void handleNewChat()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            <span>{t.mobile.newChat}</span>
          </button>
          <button
            type="button"
            className="mobile-dock-profile"
            aria-label={t.header.settings}
            onClick={() => setSettingsOpen(true)}
          >
            <BrandMark size={36} />
          </button>
          <button
            type="button"
            className="mobile-dock-mic"
            aria-label={t.chat.startVoice}
            onClick={() => void handleNewChat()}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" strokeLinecap="round" />
            </svg>
          </button>
        </footer>
      ) : null}

      <SearchModal
        open={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onOpenSettings={() => {
          setSearchModalOpen(false);
          setSettingsOpen(true);
        }}
        onNewChat={() => void handleNewChat()}
        onOpenConversation={(id) => void navigateToChatThread(id)}
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
