import { useEffect } from "react";
import { useChatStore } from "../../chat/store/chatStore";
import {
  attachmentDisplayName,
  formatAttachmentDate,
  formatAttachmentSize,
  useLibraryStore
} from "../store/libraryStore";
import type { LibraryFilter } from "../types/library.types";

const FILTERS: { id: LibraryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "images", label: "Images" },
  { id: "files", label: "Files" }
];

export function LibraryPanel() {
  const items = useLibraryStore((s) => s.items);
  const total = useLibraryStore((s) => s.total);
  const filter = useLibraryStore((s) => s.filter);
  const loading = useLibraryStore((s) => s.loading);
  const error = useLibraryStore((s) => s.error);
  const loadAttachments = useLibraryStore((s) => s.loadAttachments);
  const setFilter = useLibraryStore((s) => s.setFilter);
  const clearError = useLibraryStore((s) => s.clearError);
  const selectConversation = useChatStore((s) => s.selectConversation);
  const setSidebarPanel = useChatStore((s) => s.setSidebarPanel);

  useEffect(() => {
    void loadAttachments();
  }, [loadAttachments]);

  const openSource = (conversationId: string) => {
    void setSidebarPanel("chats");
    void selectConversation(conversationId);
  };

  return (
    <div className="library-panel">
      <header className="library-header">
        <div>
          <h1 className="library-title">Library</h1>
          <p className="library-subtitle">
            Attachments from your saved conversations ({total} item{total === 1 ? "" : "s"})
          </p>
        </div>
        <div className="library-filters" role="tablist" aria-label="Attachment filters">
          {FILTERS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={filter === entry.id}
              className={filter === entry.id ? "library-filter active" : "library-filter"}
              onClick={() => setFilter(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </header>

      {error ? (
        <div className="banner-error library-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={clearError}>
            Dismiss
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="library-placeholder">Loading attachments…</p>
      ) : items.length === 0 ? (
        <div className="library-empty">
          <p className="library-empty-title">No attachments yet</p>
          <p className="library-empty-sub">
            Images and files you attach in chats will show up here.
          </p>
        </div>
      ) : (
        <div className="library-table-wrap">
          <table className="library-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Modified</th>
                <th scope="col">Size</th>
                <th scope="col">Source conversation</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="library-name-cell">
                      <span className={`library-kind-badge library-kind-badge--${item.kind}`}>
                        {item.kind}
                      </span>
                      <span className="library-filename">{attachmentDisplayName(item)}</span>
                      <span className="library-mime">{item.mimeType}</span>
                    </div>
                  </td>
                  <td>{formatAttachmentDate(item.modifiedAt)}</td>
                  <td>{formatAttachmentSize(item.sizeBytes)}</td>
                  <td>
                    <button
                      type="button"
                      className="library-source-link"
                      onClick={() => openSource(item.conversationId)}
                    >
                      {item.conversationTitle || "Untitled chat"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
