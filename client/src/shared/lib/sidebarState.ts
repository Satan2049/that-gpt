export const SIDEBAR_EXPANDED_KEY = "thatgpt-sidebar-expanded";
export const SIDEBAR_WIDTH_KEY = "thatgpt-sidebar-width";

export const SIDEBAR_MIN_WIDTH = 220;
export const SIDEBAR_MAX_WIDTH = 360;
export const SIDEBAR_DEFAULT_WIDTH = 260;

export function readSidebarExpanded(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(SIDEBAR_EXPANDED_KEY) !== "false";
}

export function writeSidebarExpanded(expanded: boolean): void {
  localStorage.setItem(SIDEBAR_EXPANDED_KEY, String(expanded));
}

export function readSidebarWidth(): number {
  if (typeof localStorage === "undefined") return SIDEBAR_DEFAULT_WIDTH;
  const raw = Number.parseInt(localStorage.getItem(SIDEBAR_WIDTH_KEY) ?? "", 10);
  if (!Number.isFinite(raw)) return SIDEBAR_DEFAULT_WIDTH;
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, raw));
}

export function writeSidebarWidth(width: number): void {
  const clamped = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width));
  localStorage.setItem(SIDEBAR_WIDTH_KEY, String(clamped));
}

export function applySidebarWidth(width: number): void {
  const clamped = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width));
  document.documentElement.style.setProperty("--sidebar-width", `${clamped}px`);
}
