type UnlistenFn = () => void;

type TauriEvent<T> = {
  payload: T;
};

function getTauriEventListen():
  | ((
      event: string,
      handler: (event: TauriEvent<unknown>) => void
    ) => Promise<UnlistenFn>)
  | null {
  const tauri = window.__TAURI__ as
    | {
        event?: {
          listen: (
            event: string,
            handler: (event: TauriEvent<unknown>) => void
          ) => Promise<UnlistenFn>;
        };
      }
    | undefined;

  return tauri?.event?.listen?.bind(tauri.event) ?? null;
}

export async function listen<T>(
  event: string,
  handler: (payload: T) => void
): Promise<UnlistenFn> {
  const listenFn = getTauriEventListen();
  if (!listenFn) {
    return () => {};
  }

  return listenFn(event, (e) => handler(e.payload as T));
}
