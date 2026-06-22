import { useState } from "react";
import { useChatStore } from "../../chat/store/chatStore";
import { ConfirmModal } from "../../../shared/components/ConfirmModal";
import { useTranslation } from "../../../shared/i18n/useTranslation";

export function ProjectsPanel() {
  const { t } = useTranslation();
  const folders = useChatStore((s) => s.folders);
  const summaries = useChatStore((s) => s.summaries);
  const selectedFolderId = useChatStore((s) => s.selectedFolderId);
  const setSelectedFolderId = useChatStore((s) => s.setSelectedFolderId);
  const createFolder = useChatStore((s) => s.createFolder);
  const deleteFolder = useChatStore((s) => s.deleteFolder);
  const [newFolderName, setNewFolderName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const onCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    await createFolder(name);
    setNewFolderName("");
  };

  return (
    <div className="projects-panel">
      <div className="projects-create">
        <input
          type="text"
          className="projects-create-input"
          placeholder={t.projects.newProject}
          value={newFolderName}
          maxLength={120}
          dir="auto"
          onChange={(e) => setNewFolderName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void onCreateFolder();
          }}
        />
        <button type="button" className="projects-create-btn" onClick={() => void onCreateFolder()}>
          +
        </button>
      </div>

      <ul className="projects-folder-list">
        {folders.length === 0 ? (
          <li className="sidebar-placeholder">{t.projects.noProjects}</li>
        ) : (
          folders.map((folder) => (
            <li key={folder.id}>
              <button
                type="button"
                className={
                  selectedFolderId === folder.id
                    ? "projects-folder-btn active"
                    : "projects-folder-btn"
                }
                onClick={() => setSelectedFolderId(folder.id)}
              >
                <span dir="auto">{folder.name}</span>
                <span className="projects-folder-count">
                  {summaries.filter((s) => s.folderId === folder.id).length}
                </span>
              </button>
              <button
                type="button"
                className="projects-folder-delete"
                aria-label={`${t.common.delete} ${folder.name}`}
                onClick={() => setPendingDelete({ id: folder.id, name: folder.name })}
              >
                ×
              </button>
            </li>
          ))
        )}
      </ul>

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title={t.projects.deleteTitle}
        message={
          pendingDelete
            ? t.projects.deleteMessage.replace("{name}", pendingDelete.name)
            : ""
        }
        confirmLabel={t.common.delete}
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) void deleteFolder(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
