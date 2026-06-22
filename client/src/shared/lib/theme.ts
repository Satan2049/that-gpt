export type Theme = "light" | "dark";

export const THEME_KEY = "thatgpt-theme";
/** Reads legacy `chatnest-theme` once, then migrates to `thatgpt-theme`. */
const LEGACY_THEME_KEY = "chatnest-theme";

export function readStoredTheme(): Theme {
  const legacy = localStorage.getItem(LEGACY_THEME_KEY);
  const current = localStorage.getItem(THEME_KEY);
  if (!current && legacy) {
    localStorage.setItem(THEME_KEY, legacy);
    localStorage.removeItem(LEGACY_THEME_KEY);
  }
  const saved = localStorage.getItem(THEME_KEY) ?? legacy;
  if (saved === "light") return "light";
  return "dark";
}

export function applyTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.setAttribute("data-theme", theme);
}

export function toggleTheme(current: Theme): Theme {
  const next: Theme = current === "light" ? "dark" : "light";
  applyTheme(next);
  return next;
}
