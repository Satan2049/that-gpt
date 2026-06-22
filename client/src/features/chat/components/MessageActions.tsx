import { useEffect, useRef, useState } from "react";
import { IconCopy, IconMore, IconRegenerate, IconShare } from "../../../shared/components/ChatIcons";
import { MessageIconButton } from "../../../shared/components/MessageIconButton";
import { toast } from "../../../shared/components/toastStore";
import { useTranslation } from "../../../shared/i18n/useTranslation";

type Props = {
  content: string;
  canRegenerate: boolean;
  onRegenerate: () => void;
  onRegenerateBranch?: () => void;
  regenerating: boolean;
  bookmarked?: boolean;
  onToggleBookmark?: () => void;
};

export function MessageActions({
  content,
  canRegenerate,
  onRegenerate,
  onRegenerateBranch,
  regenerating,
  bookmarked,
  onToggleBookmark
}: Props) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  const onCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      toast(t.messageActions.copied);
    } catch {
      // ignore
    }
  };

  const onShare = async () => {
    if (!content) return;
    try {
      if (navigator.share) {
        await navigator.share({ text: content });
      } else {
        await navigator.clipboard.writeText(content);
        toast(t.messageActions.copiedForSharing);
      }
    } catch {
      // ignore cancel
    }
  };

  if (!content && !canRegenerate && !onToggleBookmark) return null;

  return (
    <div className="message-toolbar">
      {content ? (
        <>
          <MessageIconButton label={t.messageActions.copy} onClick={() => void onCopy()}>
            <IconCopy size={15} />
          </MessageIconButton>
          <MessageIconButton label={t.messageActions.share} onClick={() => void onShare()}>
            <IconShare size={15} />
          </MessageIconButton>
        </>
      ) : null}
      {canRegenerate ? (
        <MessageIconButton
          label={t.messageActions.regenerate}
          disabled={regenerating}
          onClick={onRegenerate}
        >
          <IconRegenerate size={15} />
        </MessageIconButton>
      ) : null}
      {onToggleBookmark ? (
        <MessageIconButton
          label={bookmarked ? t.messageActions.removeBookmark : t.messageActions.bookmark}
          active={bookmarked}
          onClick={onToggleBookmark}
        >
          {bookmarked ? "★" : "☆"}
        </MessageIconButton>
      ) : null}
      {onRegenerateBranch ? (
        <div className="message-toolbar-menu" ref={menuRef}>
          <MessageIconButton label={t.messageActions.more} onClick={() => setMenuOpen((v) => !v)}>
            <IconMore size={15} />
          </MessageIconButton>
          {menuOpen ? (
            <div className="message-toolbar-dropdown" role="menu">
              <button
                type="button"
                role="menuitem"
                disabled={regenerating}
                onClick={() => {
                  onRegenerateBranch();
                  setMenuOpen(false);
                }}
              >
                {t.messageActions.alternateReply}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
