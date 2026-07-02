import { useMediaQuery } from "./useMediaQuery";
import { isTauri } from "../lib/tauriWindow";

function isTauriMobileUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("tauri") && (ua.includes("android") || ua.includes("iphone") || ua.includes("ipad"));
}

function isLikelyTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

/**
 * Mobile shell on narrow viewports and on Tauri Android/iOS webviews.
 * Desktop shell on wide screens (including resized Tauri desktop windows).
 */
export function useShellLayout(): "mobile" | "desktop" {
  const isNarrow = useMediaQuery("(max-width: 900px)");
  const isTabletWide = useMediaQuery("(max-width: 1100px)");
  const isCoarsePointer = useMediaQuery("(pointer: coarse)");
  const isShortLandscape = useMediaQuery("(max-height: 500px) and (orientation: landscape)");
  const isTouchDevice = isLikelyTouchDevice();

  if (isTauriMobileUserAgent()) return "mobile";
  if (isTauri() && (isCoarsePointer || isTouchDevice)) return "mobile";
  if (isNarrow) return "mobile";
  if (isCoarsePointer && isTabletWide) return "mobile";
  if (isShortLandscape) return "mobile";
  return "desktop";
}
