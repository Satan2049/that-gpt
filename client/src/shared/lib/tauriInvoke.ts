function getTauriInvoke():
  | ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>)
  | null {
  const tauri = window.__TAURI__;
  if (!tauri) return null;

  if (typeof tauri.invoke === "function") {
    return tauri.invoke.bind(tauri);
  }

  if (tauri.core && typeof tauri.core.invoke === "function") {
    return tauri.core.invoke.bind(tauri.core);
  }

  return null;
}

/**
 * Invoke a Tauri command via `window.__TAURI__.invoke()`.
 * Requires running inside the Tauri desktop shell (`npm run dev` / built app).
 */
export async function invoke<T>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> {
  const tauriInvoke = getTauriInvoke();
  if (!tauriInvoke) {
    throw new Error(
      "Tauri is not available. Start the desktop app with `npm run dev` from the project root."
    );
  }

  return tauriInvoke(cmd, args) as Promise<T>;
}
