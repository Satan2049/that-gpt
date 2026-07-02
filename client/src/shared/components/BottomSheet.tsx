import { useEffect } from "react";
import { registerMobileBackHandler } from "../lib/mobileBackStack";
import { useTranslation } from "../i18n/useTranslation";

type SheetAction = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  destructive?: boolean;
  onClick: () => void;
};

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  actions: SheetAction[];
};

export function BottomSheet({ open, title, onClose, actions }: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    return registerMobileBackHandler(() => {
      onClose();
      return true;
    });
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="bottom-sheet-overlay" role="presentation" onClick={onClose}>
      <div
        className="bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bottom-sheet-handle" aria-hidden="true" />
        <header className="bottom-sheet-header">
          <h2 className="bottom-sheet-title">{title}</h2>
          <button type="button" className="bottom-sheet-close" onClick={onClose}>
            {t.common.close}
          </button>
        </header>
        <div className="bottom-sheet-actions" role="menu">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              className={
                action.destructive
                  ? "bottom-sheet-action bottom-sheet-action--destructive"
                  : "bottom-sheet-action"
              }
              disabled={action.disabled}
              onClick={() => {
                action.onClick();
                onClose();
              }}
            >
              {action.icon ? (
                <span className="bottom-sheet-action-icon" aria-hidden="true">
                  {action.icon}
                </span>
              ) : null}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
