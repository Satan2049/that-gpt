import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useChatStore } from "../store/chatStore";
import { ConversationContextMenu } from "./ConversationContextMenu";
import { ConfirmModal } from "../../../shared/components/ConfirmModal";
import { ConversationListSkeleton } from "../../../shared/components/Skeleton";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import { IconMore, IconPin } from "./ConversationMenuIcons";
import { toast } from "../../../shared/components/toastStore";

export type ConversationListHandle = {
  focusSearch: () => void;
};

type Props = {
  onNavigate?: () => void;
  showSearch?: boolean;
};

type ContextMenuState = {
  itemId: string;
  x: number;
  y: number;
} | null;

function ConversationRows({
  items,
  activeId,
  renamingId,
  renameValue,
  setRenamingId,
  setRenameValue,
  onSelect,
  openContextMenu,
  startRename,
  commitRename
}: {
  items: ReturnType<typeof useChatStore.getState>["summaries"];
  activeId: string | null;
  renamingId: string | null;
  renameValue: string;
  setRenamingId: (id: string | null) => void;
  setRenameValue: (value: string) => void;
  onSelect: (id: string) => void;
  openContextMenu: (id: string, x: number, y: number) => void;
  startRename: (id: string, title: string) => void;
  commitRename: (id: string) => Promise<void>;
}) {
  const { t } = useTranslation();

  return (
    <ul className="conversation-items">
      {items.map((item) => (
        <li
          key={item.id}
          className={
            (item.id === activeId ? "conversation-item active" : "conversation-item") +
            (item.pinned ? " conversation-item--pinned" : "")
          }
          onContextMenu={(e) => {
            e.preventDefault();
            openContextMenu(item.id, e.clientX, e.clientY);
          }}
        >
          {renamingId === item.id ? (
            <input
              type="text"
              className="conversation-rename-input"
              value={renameValue}
              maxLength={200}
              autoFocus
              dir="auto"
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void commitRename(item.id);
                if (e.key === "Escape") setRenamingId(null);
              }}
              onBlur={() => void commitRename(item.id)}
            />
          ) : (
            <>
              <button
                type="button"
                className="conversation-select"
                onClick={() => onSelect(item.id)}
                onDoubleClick={() => startRename(item.id, item.title)}
              >
                <span className="conversation-title" dir="auto">
                  {item.title}
                </span>
                {item.ephemeral ? (
                  <span className="conversation-badge">{t.chat.temporary}</span>
                ) : null}
              </button>
              <div className="conversation-item-actions">
                {item.pinned ? (
                  <span className="conversation-pinned-mark" title={t.conversation.pinChat}>
                    <IconPin size={12} />
                  </span>
                ) : null}
                <button
                  type="button"
                  className="conversation-action-btn conversation-action-btn--more"
                  aria-label={t.conversation.moreOptions}
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    openContextMenu(item.id, rect.left, rect.bottom + 4);
                  }}
                >
                  <IconMore size={11} />
                </button>
              </div>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

export const ConversationList = forwardRef<ConversationListHandle, Props>(
  function ConversationList({ onNavigate, showSearch = false }, ref) {
    const { t } = useTranslation();
    const summaries = useChatStore((s) => s.summaries);
    const folders = useChatStore((s) => s.folders);
    const sidebarPanel = useChatStore((s) => s.sidebarPanel);
    const activeId = useChatStore((s) => s.activeConversationId);
    const loadingList = useChatStore((s) => s.loadingList);
    const searchQuery = useChatStore((s) => s.searchQuery);
    const selectConversation = useChatStore((s) => s.selectConversation);
    const deleteConversation = useChatStore((s) => s.deleteConversation);
    const searchConversations = useChatStore((s) => s.searchConversations);
    const renameConversation = useChatStore((s) => s.renameConversation);
    const loadConversations = useChatStore((s) => s.loadConversations);
    const pinConversation = useChatStore((s) => s.pinConversation);
    const archiveConversation = useChatStore((s) => s.archiveConversation);
    const moveConversationToFolder = useChatStore((s) => s.moveConversationToFolder);
    const exportActiveConversation = useChatStore((s) => s.exportActiveConversation);
    const copyConversationMarkdown = useChatStore((s) => s.copyConversationMarkdown);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState("");
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
    const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(
      null
    );

    useImperativeHandle(ref, () => ({
      focusSearch: () => {
        searchInputRef.current?.focus();
      }
    }));

    useEffect(() => {
      setQuery(searchQuery);
    }, [searchQuery]);

    useEffect(() => {
      if (showSearch) {
        searchInputRef.current?.focus();
      }
    }, [showSearch]);

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

    const { pinned, recents } = useMemo(() => {
      const pinnedItems = summaries.filter((s) => s.pinned);
      const recentItems = summaries.filter((s) => !s.pinned);
      return { pinned: pinnedItems, recents: recentItems };
    }, [summaries]);

    const contextItem = contextMenu
      ? summaries.find((s) => s.id === contextMenu.itemId)
      : undefined;

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
      setPendingDelete({ id, title });
    };

    const handleSelect = (id: string) => {
      void selectConversation(id);
      onNavigate?.();
    };

    const runShare = async (id: string) => {
      if (activeId !== id) {
        await selectConversation(id);
      }
      try {
        await copyConversationMarkdown();
        toast(t.messageActions.copiedForSharing);
      } catch {
        await exportActiveConversation("markdown");
      }
    };

    const rowProps = {
      activeId,
      renamingId,
      renameValue,
      setRenamingId,
      setRenameValue,
      onSelect: handleSelect,
      openContextMenu: (id: string, x: number, y: number) => setContextMenu({ itemId: id, x, y }),
      startRename,
      commitRename
    };

    return (
      <div className="conversation-list">
        {showSearch ? (
          <input
            ref={searchInputRef}
            type="search"
            className="conversation-search"
            placeholder={t.nav.searchChats}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t.nav.searchChats}
          />
        ) : null}

        {loadingList ? (
          <ConversationListSkeleton />
        ) : summaries.length === 0 ? (
          <div className="sidebar-placeholder">
            {sidebarPanel === "archived"
              ? t.conversation.noArchived
              : query.trim()
                ? t.conversation.noMatches
                : t.conversation.noConversations}
          </div>
        ) : (
          <div className="conversation-scroll">
            {sidebarPanel === "chats" && pinned.length > 0 ? (
              <div className="conversation-section">
                <div className="sidebar-recents-label">{t.conversation.pinned}</div>
                <ConversationRows items={pinned} {...rowProps} />
              </div>
            ) : null}
            <div className="conversation-section">
              {sidebarPanel === "chats" && pinned.length > 0 ? (
                <div className="sidebar-recents-label">{t.nav.recents}</div>
              ) : null}
              <ConversationRows items={sidebarPanel === "chats" ? recents : summaries} {...rowProps} />
            </div>
          </div>
        )}

        {contextMenu && contextItem ? (
          <ConversationContextMenu
            item={contextItem}
            folders={folders}
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onRename={() => startRename(contextItem.id, contextItem.title)}
            onPin={(pinnedValue) => void pinConversation(contextItem.id, pinnedValue)}
            onArchive={(archived) => void archiveConversation(contextItem.id, archived)}
            onMoveToFolder={(folderId) => void moveConversationToFolder(contextItem.id, folderId)}
            onShare={() => void runShare(contextItem.id)}
            onDelete={() => confirmDelete(contextItem.id, contextItem.title)}
          />
        ) : null}

        <ConfirmModal
          open={Boolean(pendingDelete)}
          title={t.conversation.deleteTitle}
          message={
            pendingDelete
              ? t.conversation.deleteMessage.replace("{name}", pendingDelete.title)
              : ""
          }
          confirmLabel={t.common.delete}
          danger
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            if (pendingDelete) void deleteConversation(pendingDelete.id);
            setPendingDelete(null);
          }}
        />
      </div>
    );
  }
);
