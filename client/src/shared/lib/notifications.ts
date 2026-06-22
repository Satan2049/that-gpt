export async function notifyGenerationComplete(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;

  try {
    let granted = Notification.permission === "granted";
    if (Notification.permission === "default") {
      const result = await Notification.requestPermission();
      granted = result === "granted";
    }
    if (!granted) return;
    if (document.hasFocus()) return;

    new Notification(title, { body, icon: "/icons/icon.png" });
  } catch {
    // ignore notification errors
  }
}
