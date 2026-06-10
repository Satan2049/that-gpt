export type Theme = "light" | "dark";

export const THEME_KEY = "chatnest-theme";

export function readStoredTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY);
  return saved === "dark" ? "dark" : "light";
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
