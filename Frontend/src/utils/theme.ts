const KEY = "theme";
export type Theme = "light" | "dark";

export function getTheme(): Theme {
  const t = localStorage.getItem(KEY);
  return t === "dark" ? "dark" : "light";
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(KEY, theme);
  document.documentElement.dataset.theme = theme;
}

export function initTheme(): void {
  setTheme(getTheme());
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}
