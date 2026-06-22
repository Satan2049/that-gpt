import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ConversationSummary } from "../types/chat.types";
import type { Folder } from "../../folders/types/folder.types";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import {
  IconArchive,
  IconChevron,
  IconFolder,
  IconPin,
  IconRename,
  IconShare,
  IconTrash
} from "./ConversationMenuIcons";

type Props = {
  item: ConversationSummary;
  folders: Folder[];
  x: number;
  y: number;
  onClose: () => void;
  onRename: () => void;
  onPin: (pinned: boolean) => void;
  onArchive: (archived: boolean) => void;
  onMoveToFolder: (folderId: string | null) => void;
  onShare: () => void;
  onDelete: () => void;
};

function clampMenuPosition(
  x: number,
  y: number,
  width: number,
  height: number
): { left: number; top: number } {
  const pad = 8;
  const maxLeft = window.innerWidth - width - pad;
  const maxTop = window.innerHeight - height - pad;
  return {
    left: Math.max(pad, Math.min(x, maxLeft)),
    top: Math.max(pad, Math.min(y, maxTop))
  };
}

export function ConversationContextMenu({
  item,
  folders,
  x,
  y,
  onClose,
  onRename,
  onPin,
  onArchive,
  onMoveToFolder,
  onShare,
  onDelete
}: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  const [projectOpen, setProjectOpen] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos(clampMenuPosition(x, y, rect.width, rect.height));
  }, [x, y, projectOpen, folders.length]);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const run = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      ref={ref}
      className="ctx-menu"
      style={{ top: pos.top, left: pos.left }}
      role="menu"
    >
      <button type="button" className="ctx-menu-item" role="menuitem" onClick={() => run(onShare)}>
        <IconShare />
        <span>{t.conversation.share}</span>
      </button>
      <button type="button" className="ctx-menu-item" role="menuitem" onClick={() => run(onRename)}>
        <IconRename />
        <span>{t.conversation.rename}</span>
      </button>

      {folders.length > 0 ? (
        <div
          className="ctx-menu-submenu"
          onMouseEnter={() => setProjectOpen(true)}
          onMouseLeave={() => setProjectOpen(false)}
        >
          <button
            type="button"
            className="ctx-menu-item ctx-menu-item--sub"
            role="menuitem"
            aria-haspopup="true"
            aria-expanded={projectOpen}
            onClick={() => setProjectOpen((v) => !v)}
          >
            <IconFolder />
            <span>{t.conversation.moveToProject}</span>
            <IconChevron />
          </button>
          {projectOpen ? (
            <div className="ctx-menu-flyout" role="menu">
              {item.folderId ? (
                <button
                  type="button"
                  className="ctx-menu-item"
                  role="menuitem"
                  onClick={() => run(() => onMoveToFolder(null))}
                >
                  <span>{t.conversation.removeFromProject}</span>
                </button>
              ) : null}
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  className={
                    item.folderId === folder.id ? "ctx-menu-item active" : "ctx-menu-item"
                  }
                  role="menuitem"
                  onClick={() => run(() => onMoveToFolder(folder.id))}
                >
                  <span dir="auto">{folder.name}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        className="ctx-menu-item"
        role="menuitem"
        onClick={() => run(() => onPin(!item.pinned))}
      >
        <IconPin />
        <span>{item.pinned ? t.conversation.unpinChat : t.conversation.pinChat}</span>
      </button>
      <button
        type="button"
        className="ctx-menu-item"
        role="menuitem"
        onClick={() => run(() => onArchive(!item.archived))}
      >
        <IconArchive />
        <span>{item.archived ? t.conversation.restore : t.conversation.archive}</span>
      </button>

      <div className="ctx-menu-divider" role="separator" />

      <button
        type="button"
        className="ctx-menu-item ctx-menu-item--danger"
        role="menuitem"
        onClick={() => run(onDelete)}
      >
        <IconTrash />
        <span>{t.conversation.delete}</span>
      </button>
    </div>
  );
}
