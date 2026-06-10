/**
 * Tauri global API typings (enabled via withGlobalTauri in tauri.conf.json).
 * @see https://v2.tauri.app/reference/javascript/api/
 */
interface TauriGlobal {
  /** Tauri 1.x / compatibility shim */
  invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
  core?: {
    invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
  };
  event?: {
    listen: (
      event: string,
      handler: (event: { payload: unknown }) => void
    ) => Promise<() => void>;
  };
}

declare global {
  interface Window {
    __TAURI__?: TauriGlobal;
  }
}

export {};
