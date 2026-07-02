import { useEffect, useRef } from "react";
import { pushMobileHistoryEntry, runMobileBackHandlers } from "../lib/mobileBackStack";

export function useAndroidBackNavigation(onBack: () => boolean, enabled = true): void {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!enabled) return;

    pushMobileHistoryEntry();

    const onPopState = () => {
      if (runMobileBackHandlers()) {
        pushMobileHistoryEntry();
        return;
      }
      if (onBackRef.current()) {
        pushMobileHistoryEntry();
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [enabled]);
}
