export const SIDEBAR_EXPANDED_KEY = "thatgpt-sidebar-expanded";

export function readSidebarExpanded(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(SIDEBAR_EXPANDED_KEY) !== "false";
}

export function writeSidebarExpanded(expanded: boolean): void {
  localStorage.setItem(SIDEBAR_EXPANDED_KEY, String(expanded));
}
