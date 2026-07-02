import { useCallback, useEffect, useState } from "react";
import { getTauriWindow } from "../shared/lib/tauriWindow";
import { useTranslation } from "../shared/i18n/useTranslation";

function MinimizeIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <rect x="1" y="4.5" width="8" height="1" fill="currentColor" />
    </svg>
  );
}

function MaximizeIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <rect
        x="1.5"
        y="1.5"
        width="7"
        height="7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <rect
        x="2.5"
        y="0.5"
        width="6"
        height="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      <rect
        x="0.5"
        y="2.5"
        width="6"
        height="6"
        fill="var(--bg-elevated)"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path
        d="M1 1L9 9M9 1L1 9"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TitleBar() {
  const { t } = useTranslation();
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const win = getTauriWindow();
    if (!win) return;
    void win.isMaximized().then(setMaximized);
  }, []);

  const refreshMaximized = useCallback(async () => {
    const win = getTauriWindow();
    if (!win) return;
    setMaximized(await win.isMaximized());
  }, []);

  const onMinimize = () => void getTauriWindow()?.minimize();
  const onToggleMaximize = () => {
    void getTauriWindow()?.toggleMaximize().then(refreshMaximized);
  };
  const onClose = () => void getTauriWindow()?.close();

  const onDragMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.detail !== 2) return;
    onToggleMaximize();
  };

  return (
    <header className="titlebar" data-tauri-drag-region onMouseDown={onDragMouseDown}>
      <div className="titlebar-brand" data-tauri-drag-region>
        <span className="titlebar-mark" aria-hidden="true" />
        <span className="titlebar-name">{t.titleBar.appName}</span>
      </div>

      <div className="titlebar-controls">
        <button
          type="button"
          className="titlebar-btn"
          aria-label={t.titleBar.minimize}
          title={t.titleBar.minimize}
          onClick={onMinimize}
        >
          <MinimizeIcon />
        </button>
        <button
          type="button"
          className="titlebar-btn"
          aria-label={maximized ? t.titleBar.restore : t.titleBar.maximize}
          title={maximized ? t.titleBar.restore : t.titleBar.maximize}
          onClick={onToggleMaximize}
        >
          {maximized ? <RestoreIcon /> : <MaximizeIcon />}
        </button>
        <button
          type="button"
          className="titlebar-btn titlebar-btn--close"
          aria-label={t.titleBar.close}
          title={t.titleBar.close}
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      </div>
    </header>
  );
}
