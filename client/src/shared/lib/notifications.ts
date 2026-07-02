const NOTIFY_KEY = "thatgpt:notify-complete";

export function readNotifyOnComplete(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(NOTIFY_KEY);
  return stored !== "false";
}

export function writeNotifyOnComplete(enabled: boolean) {
  localStorage.setItem(NOTIFY_KEY, enabled ? "true" : "false");
}

export async function notifyGenerationComplete(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (!readNotifyOnComplete()) return;

  try {
    let granted = Notification.permission === "granted";
    if (Notification.permission === "default") {
      const result = await Notification.requestPermission();
      granted = result === "granted";
    }
    if (!granted) return;
    if (document.hasFocus()) return;

    new Notification(title, { body, icon: "/logo.svg" });
  } catch {
    // ignore notification errors
  }
}
