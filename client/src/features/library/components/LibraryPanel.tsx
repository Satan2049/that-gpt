import { useEffect } from "react";
import { useChatStore } from "../../chat/store/chatStore";
import {
  attachmentDisplayName,
  formatAttachmentDate,
  formatAttachmentSize,
  useLibraryStore
} from "../store/libraryStore";
import type { LibraryFilter } from "../types/library.types";
import { useMobileLayout } from "../../../shared/hooks/useMobileLayout";
import { useTranslation } from "../../../shared/i18n/useTranslation";

type Props = {
  onOpenConversation?: (conversationId: string) => void;
};

export function LibraryPanel({ onOpenConversation }: Props) {
  const { t } = useTranslation();
  const isMobile = useMobileLayout();
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

  const filters: { id: LibraryFilter; label: string }[] = [
    { id: "all", label: t.library.filterAll },
    { id: "images", label: t.library.filterImages },
    { id: "files", label: t.library.filterFiles }
  ];

  useEffect(() => {
    void loadAttachments();
  }, [loadAttachments]);

  const openSource = (conversationId: string) => {
    void setSidebarPanel("chats");
    void selectConversation(conversationId);
    onOpenConversation?.(conversationId);
  };

  const subtitle = t.library.subtitle.replace("{count}", String(total));

  return (
    <div className={isMobile ? "library-panel library-panel--mobile" : "library-panel"}>
      {!isMobile ? (
        <header className="library-header">
          <div>
            <h1 className="library-title">{t.library.title}</h1>
            <p className="library-subtitle">{subtitle}</p>
          </div>
          <div className="library-filters" role="tablist" aria-label={t.library.title}>
            {filters.map((entry) => (
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
      ) : (
        <div className="library-mobile-toolbar">
          <div className="library-filters library-filters--mobile" role="tablist" aria-label={t.library.title}>
            {filters.map((entry) => (
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
          <p className="library-mobile-count">{subtitle}</p>
        </div>
      )}

      {error ? (
        <div className="banner-error library-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={clearError}>
            {t.common.close}
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="library-placeholder">{t.library.loading}</p>
      ) : items.length === 0 ? (
        <div className="library-empty">
          <p className="library-empty-title">{t.library.emptyTitle}</p>
          <p className="library-empty-sub">{t.library.emptySub}</p>
        </div>
      ) : isMobile ? (
        <ul className="library-card-list">
          {items.map((item) => (
            <li key={item.id} className="library-card">
              <div className="library-card-main">
                <span className={`library-kind-badge library-kind-badge--${item.kind}`}>
                  {item.kind}
                </span>
                <span className="library-filename" dir="auto">
                  {attachmentDisplayName(item)}
                </span>
                <span className="library-card-meta">
                  {formatAttachmentSize(item.sizeBytes)} · {formatAttachmentDate(item.modifiedAt)}
                </span>
              </div>
              <button
                type="button"
                className="library-card-source"
                onClick={() => openSource(item.conversationId)}
              >
                {item.conversationTitle || t.library.untitledChat}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="library-table-wrap">
          <table className="library-table">
            <thead>
              <tr>
                <th scope="col">{t.library.name}</th>
                <th scope="col">{t.library.modified}</th>
                <th scope="col">{t.library.size}</th>
                <th scope="col">{t.library.source}</th>
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
                      {item.conversationTitle || t.library.untitledChat}
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
