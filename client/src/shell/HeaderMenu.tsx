import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../shared/i18n/useTranslation";

type Props = {
  canExport: boolean;
  exporting: boolean;
  onExportMarkdown: () => void;
  onExportJson: () => void;
  onExportHtml: () => void;
  onCopyMarkdown?: () => void;
  onOpenSettings: () => void;
  onPreviewPrompt?: () => void;
};

export function HeaderMenu({
  canExport,
  exporting,
  onExportMarkdown,
  onExportJson,
  onExportHtml,
  onCopyMarkdown,
  onOpenSettings,
  onPreviewPrompt
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const run = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <div className="header-menu" ref={rootRef}>
      <button
        type="button"
        className="header-menu-trigger"
        aria-label={t.header.moreActions}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {open ? (
        <div className="header-menu-panel" role="menu">
          <button
            type="button"
            role="menuitem"
            disabled={!canExport || exporting}
            onClick={() => run(onExportMarkdown)}
          >
            {t.header.exportMarkdown}
          </button>
          {onCopyMarkdown ? (
            <button
              type="button"
              role="menuitem"
              disabled={!canExport}
              onClick={() => run(onCopyMarkdown)}
            >
              {t.header.copyMarkdown}
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            disabled={!canExport || exporting}
            onClick={() => run(onExportJson)}
          >
            {t.header.exportJson}
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!canExport || exporting}
            onClick={() => run(onExportHtml)}
          >
            {t.header.shareHtml}
          </button>
          {onPreviewPrompt ? (
            <button
              type="button"
              role="menuitem"
              disabled={!canExport}
              onClick={() => run(onPreviewPrompt)}
            >
              {t.header.viewApiPrompt}
            </button>
          ) : null}
          <hr className="header-menu-divider" />
          <button type="button" role="menuitem" onClick={() => run(onOpenSettings)}>
            {t.header.settings}
          </button>
        </div>
      ) : null}
    </div>
  );
}
