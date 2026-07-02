import { useEffect, useRef, useState } from "react";
import { IconCopy, IconEdit, IconMore } from "../../../shared/components/ChatIcons";
import { BottomSheet } from "../../../shared/components/BottomSheet";
import { MessageIconButton } from "../../../shared/components/MessageIconButton";
import { toast } from "../../../shared/components/toastStore";
import { useMobileLayout } from "../../../shared/hooks/useMobileLayout";
import { useTranslation } from "../../../shared/i18n/useTranslation";

type Props = {
  content: string;
  canEdit: boolean;
  editing: boolean;
  onEdit: () => void;
  onFork?: () => void;
  bookmarked?: boolean;
  onToggleBookmark?: () => void;
};

export function UserMessageActions({
  content,
  canEdit,
  editing,
  onEdit,
  onFork,
  bookmarked,
  onToggleBookmark
}: Props) {
  const { t } = useTranslation();
  const isMobile = useMobileLayout();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen || isMobile) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen, isMobile]);

  if (!canEdit || editing) return null;

  const onCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      toast(t.messageActions.copied);
    } catch {
      // ignore
    }
  };

  if (isMobile) {
    const actions = [
      { id: "copy", label: t.messageActions.copy, onClick: () => void onCopy() },
      { id: "edit", label: t.messageActions.edit, onClick: onEdit },
      ...(onToggleBookmark
        ? [
            {
              id: "bookmark",
              label: bookmarked ? t.messageActions.removeBookmark : t.messageActions.bookmark,
              onClick: onToggleBookmark
            }
          ]
        : []),
      ...(onFork
        ? [{ id: "fork", label: t.messageActions.forkConversation, onClick: onFork }]
        : [])
    ];

    return (
      <>
        <div className="message-toolbar message-toolbar--mobile">
          <MessageIconButton label={t.messageActions.more} onClick={() => setSheetOpen(true)}>
            <IconMore size={15} />
          </MessageIconButton>
        </div>
        <BottomSheet
          open={sheetOpen}
          title={t.messageActions.more}
          onClose={() => setSheetOpen(false)}
          actions={actions}
        />
      </>
    );
  }

  return (
    <div className="message-toolbar">
      <MessageIconButton label={t.messageActions.copy} onClick={() => void onCopy()}>
        <IconCopy size={15} />
      </MessageIconButton>
      <MessageIconButton label={t.messageActions.edit} onClick={onEdit}>
        <IconEdit size={15} />
      </MessageIconButton>
      {onToggleBookmark ? (
        <MessageIconButton
          label={bookmarked ? t.messageActions.removeBookmark : t.messageActions.bookmark}
          active={bookmarked}
          onClick={onToggleBookmark}
        >
          {bookmarked ? "★" : "☆"}
        </MessageIconButton>
      ) : null}
      {onFork ? (
        <div className="message-toolbar-menu" ref={menuRef}>
          <MessageIconButton label={t.messageActions.more} onClick={() => setMenuOpen((v) => !v)}>
            <IconMore size={15} />
          </MessageIconButton>
          {menuOpen ? (
            <div className="message-toolbar-dropdown" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onFork();
                  setMenuOpen(false);
                }}
              >
                {t.messageActions.forkConversation}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
