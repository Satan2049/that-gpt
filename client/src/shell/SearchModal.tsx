import { useEffect, useMemo, useRef, useState } from "react";
import type { ConversationSummary } from "../features/chat/types/chat.types";
import * as chatApi from "../features/chat/services/chatApi";
import * as templateApi from "../features/templates/services/templateApi";
import { useChatStore } from "../features/chat/store/chatStore";
import { requestOpenModelSelector } from "../features/chat/lib/modelUtils";
import { applyTheme, toggleTheme, type Theme } from "../shared/lib/theme";

type Props = {
  open: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onNewChat: () => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
};

type SearchGroup = {
  label: string;
  items: ConversationSummary[];
};

type PaletteCommand = {
  id: string;
  label: string;
  hint: string;
  run: () => void | Promise<void>;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function groupSearchResults(items: ConversationSummary[]): SearchGroup[] {
  const now = new Date();
  const today = startOfDay(now).getTime();
  const yesterday = today - 86_400_000;
  const weekAgo = today - 7 * 86_400_000;

  const groups: Record<string, ConversationSummary[]> = {
    Today: [],
    Yesterday: [],
    "Previous 7 days": [],
    Older: []
  };

  for (const item of items) {
    const ts = new Date(item.updatedAt).getTime();
    if (ts >= today) groups.Today.push(item);
    else if (ts >= yesterday) groups.Yesterday.push(item);
    else if (ts >= weekAgo) groups["Previous 7 days"].push(item);
    else groups.Older.push(item);
  }

  return Object.entries(groups)
    .filter(([, groupItems]) => groupItems.length > 0)
    .map(([label, groupItems]) => ({ label, items: groupItems }));
}

export function SearchModal({
  open,
  onClose,
  onOpenSettings,
  onNewChat,
  theme,
  onThemeChange
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchConversations = useChatStore((s) => s.searchConversations);
  const selectConversation = useChatStore((s) => s.selectConversation);
  const createConversation = useChatStore((s) => s.createConversation);
  const setSidebarPanel = useChatStore((s) => s.setSidebarPanel);
  const setShowBookmarksOnly = useChatStore((s) => s.setShowBookmarksOnly);
  const activeConversation = useChatStore((s) => s.activeConversation);

  const commandMode = query.trimStart().startsWith(">");

  const commands = useMemo<PaletteCommand[]>(
    () => [
      {
        id: "new",
        label: "New chat",
        hint: "Start a fresh conversation",
        run: () => {
          onNewChat();
          onClose();
        }
      },
      {
        id: "settings",
        label: "Open settings",
        hint: "API keys, providers, personalization",
        run: () => onOpenSettings()
      },
      {
        id: "model",
        label: "Switch model",
        hint: "Open header model picker",
        run: () => {
          requestOpenModelSelector();
          onClose();
        }
      },
      {
        id: "bookmarks",
        label: "Show bookmarks",
        hint: "Filter current chat to starred messages",
        run: () => {
          void setSidebarPanel("chats");
          setShowBookmarksOnly(true);
          onClose();
        }
      },
      {
        id: "theme",
        label: "Toggle theme",
        hint: `Currently ${theme}`,
        run: () => onThemeChange(toggleTheme(theme))
      },
      {
        id: "save-template",
        label: "Save as template",
        hint: "Save the active conversation as a reusable template",
        run: async () => {
          if (!activeConversation) return;
          const name = window.prompt("Template name", activeConversation.title)?.trim();
          if (!name) return;
          await templateApi.apiSaveTemplate(activeConversation.id, name);
          onClose();
        }
      }
    ],
    [activeConversation, onClose, onNewChat, onOpenSettings, onThemeChange, setShowBookmarksOnly, setSidebarPanel, theme]
  );

  const filteredCommands = useMemo(() => {
    if (!commandMode) return [];
    const token = query.trim().slice(1).trim().toLowerCase();
    if (!token) return commands;
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(token) || cmd.id.toLowerCase().includes(token)
    );
  }, [commandMode, commands, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setHighlightIndex(0);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open || commandMode) return;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        if (query.trim()) {
          await searchConversations(query);
          setResults(useChatStore.getState().summaries);
        } else {
          const all = await chatApi.apiListConversations("all");
          setResults(all);
        }
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => window.clearTimeout(timer);
  }, [open, query, searchConversations, commandMode]);

  const flatResults = useMemo(() => groupSearchResults(results).flatMap((g) => g.items), [results]);
  const grouped = useMemo(() => groupSearchResults(results), [results]);
  const activeListLength = commandMode ? filteredCommands.length : flatResults.length;

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, results.length, commandMode, filteredCommands.length]);

  if (!open) return null;

  const openConversation = async (id: string) => {
    await setSidebarPanel("chats");
    await selectConversation(id);
    onClose();
  };

  const runHighlighted = () => {
    if (commandMode) {
      const cmd = filteredCommands[highlightIndex];
      if (cmd) void cmd.run();
      return;
    }
    const item = flatResults[highlightIndex];
    if (item) void openConversation(item.id);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, Math.max(activeListLength - 1, 0)));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      runHighlighted();
    }
  };

  let runningIndex = -1;

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div
        className="search-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Search and commands"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="search"
          className="search-modal-input"
          placeholder="Search chats… or type > for commands"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />

        <div className="search-modal-actions">
          <button type="button" onClick={() => void createConversation().then(onClose)}>
            New chat
          </button>
        </div>

        <div className="search-modal-results">
          {commandMode ? (
            filteredCommands.length === 0 ? (
              <div className="search-modal-empty">No matching commands.</div>
            ) : (
              <div className="search-modal-group">
                <div className="search-modal-group-label">Commands</div>
                {filteredCommands.map((cmd, index) => (
                  <button
                    key={cmd.id}
                    type="button"
                    className={
                      index === highlightIndex ? "search-modal-item active" : "search-modal-item"
                    }
                    onMouseEnter={() => setHighlightIndex(index)}
                    onClick={() => void cmd.run()}
                  >
                    <span className="search-modal-item-title">{cmd.label}</span>
                    <span className="search-modal-item-meta">{cmd.hint}</span>
                  </button>
                ))}
              </div>
            )
          ) : loading ? (
            <div className="search-modal-empty">Searching…</div>
          ) : flatResults.length === 0 ? (
            <div className="search-modal-empty">No conversations found.</div>
          ) : (
            grouped.map((group) => (
              <div key={group.label} className="search-modal-group">
                <div className="search-modal-group-label">{group.label}</div>
                {group.items.map((item) => {
                  runningIndex += 1;
                  const index = runningIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={
                        index === highlightIndex
                          ? "search-modal-item active"
                          : "search-modal-item"
                      }
                      onMouseEnter={() => setHighlightIndex(index)}
                      onClick={() => void openConversation(item.id)}
                    >
                      <span className="search-modal-item-title">{item.title}</span>
                      {item.pinned ? <span className="search-modal-item-meta">Pinned</span> : null}
                      {item.ephemeral ? (
                        <span className="search-modal-item-meta">Temporary</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
