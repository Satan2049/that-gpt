import { useChatStore } from "../store/chatStore";

export function ConversationList() {
  const summaries = useChatStore((s) => s.summaries);
  const activeId = useChatStore((s) => s.activeConversationId);
  const loadingList = useChatStore((s) => s.loadingList);
  const selectConversation = useChatStore((s) => s.selectConversation);
  const createConversation = useChatStore((s) => s.createConversation);
  const deleteConversation = useChatStore((s) => s.deleteConversation);

  return (
    <div className="conversation-list">
      <div className="sidebar-actions">
        <button type="button" className="btn-primary" onClick={() => void createConversation()}>
          New chat
        </button>
      </div>
      {loadingList ? (
        <div className="sidebar-placeholder">Loading…</div>
      ) : summaries.length === 0 ? (
        <div className="sidebar-placeholder">No conversations yet. Create one to start.</div>
      ) : (
        <ul className="conversation-items">
          {summaries.map((item) => (
            <li key={item.id} className={item.id === activeId ? "conversation-item active" : "conversation-item"}>
              <button
                type="button"
                className="conversation-select"
                onClick={() => void selectConversation(item.id)}
              >
                <span className="conversation-title">{item.title}</span>
              </button>
              <button
                type="button"
                className="conversation-delete"
                title="Delete conversation"
                aria-label="Delete conversation"
                onClick={() => void deleteConversation(item.id)}
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
