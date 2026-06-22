import { useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { useChatStore } from "../../chat/store/chatStore";
import type { ComposerHandle } from "../../chat/components/Composer";
import { ProjectSettingsModal } from "./ProjectSettingsModal";
import { readFileAsBase64Data } from "../../chat/lib/readFileAttachment";
import { useTranslation } from "../../../shared/i18n/useTranslation";

type Tab = "chats" | "sources";

type Props = {
  folderId: string;
  composerRef: RefObject<ComposerHandle | null>;
};

export function ProjectWorkspace({ folderId, composerRef }: Props) {
  const { t } = useTranslation();
  const folders = useChatStore((s) => s.folders);
  const summaries = useChatStore((s) => s.summaries);
  const createConversationInFolder = useChatStore((s) => s.createConversationInFolder);
  const selectConversation = useChatStore((s) => s.selectConversation);
  const setSidebarPanel = useChatStore((s) => s.setSidebarPanel);
  const refreshFolders = useChatStore((s) => s.loadFolders);
  const addFolderSource = useChatStore((s) => s.addFolderSource);
  const removeFolderSource = useChatStore((s) => s.removeFolderSource);

  const [tab, setTab] = useState<Tab>("chats");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const folder = folders.find((f) => f.id === folderId);
  const chats = useMemo(
    () => summaries.filter((s) => s.folderId === folderId && !s.archived),
    [summaries, folderId]
  );
  const sources = folder?.sources ?? [];

  const onNewChat = async () => {
    await createConversationInFolder(folderId);
    await setSidebarPanel("chats");
    composerRef.current?.focus();
  };

  const onOpenChat = async (id: string) => {
    await selectConversation(id);
    await setSidebarPanel("chats");
    composerRef.current?.focus();
  };

  const onUploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const dataBase64 = await readFileAsBase64Data(file);
        await addFolderSource(folderId, file.name, file.type || "application/octet-stream", dataBase64);
      }
    } finally {
      setUploading(false);
    }
  };

  if (!folder) {
    return (
      <div className="project-workspace">
        <p className="sidebar-placeholder">{t.projects.notFound}</p>
      </div>
    );
  }

  return (
    <div className="project-workspace">
      <header className="project-workspace-header">
        <div className="project-workspace-title-row">
          <h1 className="project-workspace-title" dir="auto">
            {folder.name}
          </h1>
          <div className="project-workspace-actions">
            <button
              type="button"
              className="project-btn-ghost"
              title={t.projects.projectSettings}
              onClick={() => setSettingsOpen(true)}
            >
              {t.projects.settings}
            </button>
            <div className="project-menu-wrap">
              <button
                type="button"
                className="project-icon-btn"
                aria-label={t.projects.projectMenu}
                onClick={() => setMenuOpen((v) => !v)}
              >
                ···
              </button>
              {menuOpen ? (
                <div className="project-menu-dropdown" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setSettingsOpen(true);
                      setMenuOpen(false);
                    }}
                  >
                    {t.projects.projectSettings}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <button type="button" className="project-new-chat-bar" onClick={() => void onNewChat()}>
          <span className="project-new-chat-plus">+</span>
          {t.projects.newChatIn} {folder.name}
        </button>

        <div className="project-tabs">
          <button
            type="button"
            className={tab === "chats" ? "project-tab active" : "project-tab"}
            onClick={() => setTab("chats")}
          >
            {t.projects.chats}
          </button>
          <button
            type="button"
            className={tab === "sources" ? "project-tab active" : "project-tab"}
            onClick={() => setTab("sources")}
          >
            {t.projects.sources}
          </button>
        </div>
      </header>

      {tab === "chats" ? (
        <div className="project-tab-panel">
          {chats.length === 0 ? (
            <div className="project-empty">
              <p className="project-empty-title">{t.projects.noChats}</p>
              <p className="project-empty-sub">{t.projects.noChatsSub}</p>
            </div>
          ) : (
            <ul className="project-chat-list">
              {chats.map((chat) => (
                <li key={chat.id}>
                  <button type="button" className="project-chat-row" onClick={() => void onOpenChat(chat.id)}>
                    <span className="project-chat-title" dir="auto">
                      {chat.title}
                    </span>
                    <span className="project-chat-meta">{new Date(chat.updatedAt).toLocaleDateString()}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="project-tab-panel">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.pdf,.docx,text/*,application/pdf"
            className="composer-file-input"
            onChange={(e) => void onUploadFiles(e.target.files)}
          />
          <div
            className="project-sources-drop"
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter") fileInputRef.current?.click();
            }}
          >
            <p>{uploading ? t.projects.uploading : t.projects.addFilesHint}</p>
            <p className="project-empty-sub">{t.projects.sourcesContextHint}</p>
          </div>
          {sources.length > 0 ? (
            <ul className="project-sources-list">
              {sources.map((source) => (
                <li key={source.id} className="project-source-row">
                  <span>{source.name}</span>
                  <span className="project-source-meta">
                    {(source.size / 1024).toFixed(0)} KB
                  </span>
                  <button
                    type="button"
                    className="project-source-remove"
                    aria-label={`${t.projects.removeSource} ${source.name}`}
                    onClick={() => void removeFolderSource(folderId, source.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      <ProjectSettingsModal
        folder={folder}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={() => void refreshFolders()}
      />
    </div>
  );
}
