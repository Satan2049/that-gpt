import { useEffect, useState } from "react";
import { useChatStore } from "../store/chatStore";

type Props = {
  onNavigate?: () => void;
};

export function ConversationList({ onNavigate }: Props) {  const summaries = useChatStore((s) => s.summaries);
  const activeId = useChatStore((s) => s.activeConversationId);
  const loadingList = useChatStore((s) => s.loadingList);
  const searchQuery = useChatStore((s) => s.searchQuery);
  const selectConversation = useChatStore((s) => s.selectConversation);
  const createConversation = useChatStore((s) => s.createConversation);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const searchConversations = useChatStore((s) => s.searchConversations);
  const renameConversation = useChatStore((s) => s.renameConversation);
  const loadConversations = useChatStore((s) => s.loadConversations);

  const [query, setQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (query.trim() === searchQuery.trim()) return;
      if (query.trim()) {
        void searchConversations(query);
      } else {
        void loadConversations();
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, searchQuery, searchConversations, loadConversations]);

  const startRename = (id: string, title: string) => {
    setRenamingId(id);
    setRenameValue(title);
  };

  const commitRename = async (id: string) => {
    const title = renameValue.trim();
    setRenamingId(null);
    if (!title) return;
    await renameConversation(id, title);
  };

  const confirmDelete = (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    void deleteConversation(id);
  };

  const handleSelect = (id: string) => {
    void selectConversation(id);
    onNavigate?.();
  };

  const handleCreate = () => {
    void createConversation();
    onNavigate?.();
  };
  return (
    <div className="conversation-list">
      <div className="sidebar-actions">
        <button type="button" className="btn-primary" onClick={handleCreate}>
          New chat
        </button>
      </div>

      <input
        type="search"
        className="conversation-search"
        placeholder="Search conversations…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search conversations"
      />

      {loadingList ? (
        <div className="sidebar-placeholder">Loading…</div>
      ) : summaries.length === 0 ? (
        <div className="sidebar-placeholder">
          {query.trim() ? "No matches." : "No conversations yet. Create one to start."}
        </div>
      ) : (
        <ul className="conversation-items">
          {summaries.map((item) => (
            <li
              key={item.id}
              className={item.id === activeId ? "conversation-item active" : "conversation-item"}
            >
              {renamingId === item.id ? (
                <input
                  type="text"
                  className="conversation-rename-input"
                  value={renameValue}
                  maxLength={200}
                  autoFocus
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void commitRename(item.id);
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  onBlur={() => void commitRename(item.id)}
                />
              ) : (
                <button
                  type="button"
                  className="conversation-select"
                  onClick={() => handleSelect(item.id)}
                >
                  <span className="conversation-title">{item.title}</span>
                </button>
              )}
              <button
                type="button"
                className="conversation-rename"
                title="Rename conversation"
                aria-label="Rename conversation"
                onClick={() => startRename(item.id, item.title)}
              >
                ✎
              </button>
              <button
                type="button"
                className="conversation-delete"
                title="Delete conversation"
                aria-label="Delete conversation"
                onClick={() => confirmDelete(item.id, item.title)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
