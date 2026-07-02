type TauriWindowApi = {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  isFullscreen: () => Promise<boolean>;
  setFullscreen: (fullscreen: boolean) => Promise<void>;
  startDragging: () => Promise<void>;
};

export function isTauri(): boolean {
  return Boolean(window.__TAURI__);
}

export function getTauriWindow(): TauriWindowApi | null {
  const tauri = window.__TAURI__ as
    | { window?: { getCurrentWindow: () => TauriWindowApi } }
    | undefined;
  return tauri?.window?.getCurrentWindow?.() ?? null;
}

export async function toggleFullscreen(): Promise<boolean> {
  const win = getTauriWindow();
  if (!win) return false;
  const next = !(await win.isFullscreen());
  await win.setFullscreen(next);
  return next;
}

export async function readFullscreen(): Promise<boolean> {
  const win = getTauriWindow();
  if (!win) return false;
  return win.isFullscreen();
}
