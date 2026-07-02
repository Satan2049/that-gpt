import { useEffect, useMemo, useRef, useState } from "react";
import type { ConversationSummary } from "../features/chat/types/chat.types";
import * as chatApi from "../features/chat/services/chatApi";
import * as templateApi from "../features/templates/services/templateApi";
import { useChatStore } from "../features/chat/store/chatStore";
import { requestOpenModelSelector } from "../features/chat/lib/modelUtils";
import { applyTheme, toggleTheme, type Theme } from "../shared/lib/theme";

import { useMobileLayout } from "../shared/hooks/useMobileLayout";
import { useTranslation } from "../shared/i18n/useTranslation";

type Props = {
  open: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onNewChat: () => void;
  onOpenConversation?: (id: string) => void;
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

function groupSearchResults(
  items: ConversationSummary[],
  labels: { today: string; yesterday: string; previous7Days: string; older: string }
): SearchGroup[] {
  const now = new Date();
  const today = startOfDay(now).getTime();
  const yesterday = today - 86_400_000;
  const weekAgo = today - 7 * 86_400_000;

  const groups: Record<string, ConversationSummary[]> = {
    [labels.today]: [],
    [labels.yesterday]: [],
    [labels.previous7Days]: [],
    [labels.older]: []
  };

  for (const item of items) {
    const ts = new Date(item.updatedAt).getTime();
    if (ts >= today) groups[labels.today].push(item);
    else if (ts >= yesterday) groups[labels.yesterday].push(item);
    else if (ts >= weekAgo) groups[labels.previous7Days].push(item);
    else groups[labels.older].push(item);
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
  onOpenConversation,
  theme,
  onThemeChange
}: Props) {
  const { t } = useTranslation();
  const isMobile = useMobileLayout();
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

  const groupLabels = {
    today: t.search.today,
    yesterday: t.search.yesterday,
    previous7Days: t.search.previous7Days,
    older: t.search.older
  };

  const commands = useMemo<PaletteCommand[]>(
    () => [
      {
        id: "new",
        label: t.search.newChat,
        hint: t.nav.newChat,
        run: () => {
          onNewChat();
          onClose();
        }
      },
      {
        id: "settings",
        label: t.header.settings,
        hint: t.footer.settingsApi,
        run: () => onOpenSettings()
      },
      {
        id: "model",
        label: t.search.commands,
        hint: "Model",
        run: () => {
          requestOpenModelSelector();
          onClose();
        }
      },
      {
        id: "bookmarks",
        label: t.chat.bookmarks,
        hint: t.chat.bookmarked,
        run: () => {
          void setSidebarPanel("chats");
          setShowBookmarksOnly(true);
          onClose();
        }
      },
      {
        id: "theme",
        label: t.settings.appearance,
        hint: theme,
        run: () => onThemeChange(toggleTheme(theme))
      },
      {
        id: "save-template",
        label: "Save as template",
        hint: activeConversation?.title ?? "",
        run: async () => {
          if (!activeConversation) return;
          const name = window.prompt("Template name", activeConversation.title)?.trim();
          if (!name) return;
          await templateApi.apiSaveTemplate(activeConversation.id, name);
          onClose();
        }
      }
    ],
    [
      activeConversation,
      onClose,
      onNewChat,
      onOpenSettings,
      onThemeChange,
      setShowBookmarksOnly,
      setSidebarPanel,
      t,
      theme
    ]
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

  const flatResults = useMemo(
    () => groupSearchResults(results, groupLabels).flatMap((g) => g.items),
    [results, groupLabels]
  );
  const grouped = useMemo(
    () => groupSearchResults(results, groupLabels),
    [results, groupLabels]
  );
  const activeListLength = commandMode ? filteredCommands.length : flatResults.length;

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, results.length, commandMode, filteredCommands.length]);

  if (!open) return null;

  const openConversation = async (id: string) => {
    await setSidebarPanel("chats");
    await selectConversation(id);
    if (onOpenConversation) {
      onOpenConversation(id);
    }
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
        aria-label={t.search.title}
        onClick={(e) => e.stopPropagation()}
      >
        {isMobile ? (
          <header className="search-modal-header">
            <h2 className="search-modal-title">{t.search.title}</h2>
            <button type="button" className="search-modal-close" onClick={onClose}>
              {t.common.close}
            </button>
          </header>
        ) : null}
        <input
          ref={inputRef}
          type="search"
          className="search-modal-input"
          placeholder={t.search.placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />

        <div className="search-modal-actions">
          <button type="button" onClick={() => void createConversation().then(onClose)}>
            {t.search.newChat}
          </button>
        </div>

        <div className="search-modal-results">
          {commandMode ? (
            filteredCommands.length === 0 ? (
              <div className="search-modal-empty">{t.search.noCommands}</div>
            ) : (
              <div className="search-modal-group">
                <div className="search-modal-group-label">{t.search.commands}</div>
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
            <div className="search-modal-empty">{t.search.searching}</div>
          ) : flatResults.length === 0 ? (
            <div className="search-modal-empty">{t.search.noResults}</div>
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
                      {item.pinned ? (
                        <span className="search-modal-item-meta">{t.search.pinned}</span>
                      ) : null}
                      {item.ephemeral ? (
                        <span className="search-modal-item-meta">{t.search.temporary}</span>
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
