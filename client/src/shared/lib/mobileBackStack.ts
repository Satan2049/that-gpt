type BackHandler = () => boolean;

const handlers: BackHandler[] = [];

export function registerMobileBackHandler(handler: BackHandler): () => void {
  handlers.push(handler);
  return () => {
    const index = handlers.lastIndexOf(handler);
    if (index >= 0) handlers.splice(index, 1);
  };
}

export function runMobileBackHandlers(): boolean {
  for (let i = handlers.length - 1; i >= 0; i -= 1) {
    if (handlers[i]()) return true;
  }
  return false;
}

export function pushMobileHistoryEntry(): void {
  window.history.pushState({ thatgptMobile: true }, "");
}
