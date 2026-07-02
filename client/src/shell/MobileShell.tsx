import { useCallback, useEffect, useRef, useState } from "react";
import { ConversationList } from "../features/chat/components/ConversationList";
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
import { useAndroidBackNavigation } from "../shared/hooks/useAndroidBackNavigation";
import type { Theme } from "../shared/lib/theme";
import { registerMobileBackHandler } from "../shared/lib/mobileBackStack";
import { HeaderMenu } from "./HeaderMenu";
import { ModelSelector } from "./ModelSelector";
import { SearchModal } from "./SearchModal";
import { SidebarFooter } from "./SidebarNav";
import { useTranslation } from "../shared/i18n/useTranslation";

type MobileTab = "chats" | "projects" | "library" | "more";
type ChatScreen = "list" | "thread";

type Props = {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
};

function TabIconChats() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function TabIconProjects() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  );
}

function TabIconLibrary() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  );
}

function TabIconMore() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function MobileShell({ theme, onThemeChange }: Props) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<MobileTab>("chats");
  const [chatScreen, setChatScreen] = useState<ChatScreen>("list");
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
  const inProjectWorkspace = activeTab === "projects" && Boolean(selectedFolderId);
  const inChatThread = activeTab === "chats" && chatScreen === "thread";
  const hideTabBar = inChatThread || inProjectWorkspace;
  const canExport = Boolean(activeConversation?.messages.length);

  useEffect(() => {
    void loadFolders();
  }, [loadFolders]);

  const handleNewChat = useCallback(async () => {
    await setSidebarPanel("chats");
    await createConversation();
    setActiveTab("chats");
    setChatScreen("thread");
    composerRef.current?.focus();
  }, [createConversation, setSidebarPanel]);

  const handleTemporaryChat = useCallback(async () => {
    await setSidebarPanel("chats");
    await createConversation({ ephemeral: true });
    setActiveTab("chats");
    setChatScreen("thread");
    composerRef.current?.focus();
  }, [createConversation, setSidebarPanel]);

  const openConversationThread = useCallback(() => {
    setChatScreen("thread");
    composerRef.current?.focus();
  }, []);

  const backToChatList = useCallback(() => {
    setChatScreen("list");
  }, []);

  const backToProjectList = useCallback(() => {
    setSelectedFolderId(null);
  }, [setSelectedFolderId]);

  const navigateToChatThread = useCallback(async (conversationId?: string) => {
    if (conversationId) {
      await selectConversation(conversationId);
    }
    await setSidebarPanel("chats");
    setActiveTab("chats");
    setChatScreen("thread");
    composerRef.current?.focus();
  }, [selectConversation, setSidebarPanel]);

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
    if (inChatThread) {
      backToChatList();
      return true;
    }
    if (inProjectWorkspace) {
      backToProjectList();
      return true;
    }
    if (activeTab !== "chats") {
      setActiveTab("chats");
      setChatScreen(activeConversationId ? "thread" : "list");
      return true;
    }
    return false;
  }, [
    activeConversationId,
    activeTab,
    backToChatList,
    backToProjectList,
    inChatThread,
    inProjectWorkspace,
    promptPreviewOpen,
    searchModalOpen,
    settingsOpen
  ]);

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

  const shellClass = [
    "mobile-shell",
    inChatThread ? "mobile-shell--thread" : "",
    inProjectWorkspace ? "mobile-shell--project-workspace" : ""
  ]
    .filter(Boolean)
    .join(" ");

  const chatsListTitle = isArchivedList ? t.nav.archived : t.mobile.chats;

  return (
    <div className={shellClass}>
      <header className="mobile-topbar">
        {inChatThread ? (
          <>
            <IconButton label={t.mobile.backToChats} onClick={backToChatList}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
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
        ) : inProjectWorkspace ? (
          <>
            <IconButton label={t.mobile.backToProjects} onClick={backToProjectList}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </IconButton>
            <span className="mobile-topbar-name">{t.projects.title}</span>
          </>
        ) : (
          <>
            <div className="mobile-topbar-title">
              <span className="mobile-topbar-name">
                {activeTab === "chats"
                  ? chatsListTitle
                  : activeTab === "projects"
                    ? t.projects.title
                    : activeTab === "library"
                      ? t.nav.library
                      : t.nav.more}
              </span>
            </div>
            {activeTab === "chats" ? (
              <div className="mobile-topbar-actions">
                <IconButton label={t.nav.searchChats} onClick={() => setSearchModalOpen(true)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-3-3" strokeLinecap="round" />
                  </svg>
                </IconButton>
                <IconButton label={t.mobile.newChat} onClick={() => void handleNewChat()}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                </IconButton>
              </div>
            ) : null}
          </>
        )}
      </header>

      {error && activeTab === "chats" && chatScreen === "thread" ? (
        <div className="mobile-banner-error banner-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={clearError}>
            Dismiss
          </button>
        </div>
      ) : null}

      <main className="mobile-main">
        {activeTab === "chats" ? (
          chatScreen === "list" ? (
            <div className="mobile-panel mobile-chats-list">
              <ConversationList
                onNavigate={openConversationThread}
                showSearch={false}
              />
            </div>
          ) : (
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
                <TokenUsageFooter />
                <div className="composer-shell">
                  <Composer ref={composerRef} />
                </div>
              </div>
            </>
          )
        ) : activeTab === "projects" ? (
          inProjectWorkspace && selectedFolderId ? (
            <ProjectWorkspace
              folderId={selectedFolderId}
              composerRef={composerRef}
              compact
              onNewChat={() => void handleProjectNewChat()}
              onOpenChat={(id) => void handleProjectOpenChat(id)}
            />
          ) : (
            <div className="mobile-panel">
              <div className="mobile-projects-panel">
                <ProjectsPanel />
              </div>
            </div>
          )
        ) : activeTab === "library" ? (
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
                  setActiveTab("chats");
                  setChatScreen("list");
                }}
              >
                <span className="mobile-more-item-icon" aria-hidden="true">
                  ★
                </span>
                {showBookmarksOnly ? t.chat.showAll : t.chat.bookmarks}
              </button>
              <button
                type="button"
                className="mobile-more-item"
                onClick={() => void handleTemporaryChat()}
              >
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
                  setActiveTab("chats");
                  setChatScreen("list");
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
              <button
                type="button"
                className="mobile-more-item"
                onClick={() => setSettingsOpen(true)}
              >
                <span className="mobile-more-item-icon" aria-hidden="true">
                  ⚙
                </span>
                {t.header.settings}
              </button>
            </div>
          </div>
        )}
      </main>

      {!hideTabBar ? (
        <nav className="mobile-tabbar" aria-label={t.mobile.tabNavigation}>
          <button
            type="button"
            className={activeTab === "chats" ? "mobile-tab active" : "mobile-tab"}
            onClick={() => {
              setActiveTab("chats");
              if (activeConversationId) setChatScreen("thread");
              else setChatScreen("list");
            }}
          >
            <span className="mobile-tab-icon" aria-hidden="true">
              <TabIconChats />
            </span>
            <span className="mobile-tab-label">{t.mobile.chats}</span>
          </button>
          <button
            type="button"
            className={activeTab === "projects" ? "mobile-tab active" : "mobile-tab"}
            onClick={() => setActiveTab("projects")}
          >
            <span className="mobile-tab-icon" aria-hidden="true">
              <TabIconProjects />
            </span>
            <span className="mobile-tab-label">{t.mobile.projects}</span>
          </button>
          <button
            type="button"
            className={activeTab === "library" ? "mobile-tab active" : "mobile-tab"}
            onClick={() => setActiveTab("library")}
          >
            <span className="mobile-tab-icon" aria-hidden="true">
              <TabIconLibrary />
            </span>
            <span className="mobile-tab-label">{t.mobile.library}</span>
          </button>
          <button
            type="button"
            className={activeTab === "more" ? "mobile-tab active" : "mobile-tab"}
            onClick={() => setActiveTab("more")}
          >
            <span className="mobile-tab-icon" aria-hidden="true">
              <TabIconMore />
            </span>
            <span className="mobile-tab-label">{t.mobile.more}</span>
          </button>
        </nav>
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
