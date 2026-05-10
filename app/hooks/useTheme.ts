"use client";

import { useEffect, useState } from "react";

type Theme = "morandi" | "pink" | "blue" | "green";

const THEMES: Theme[] = ["morandi", "pink", "blue", "green"];
const STORAGE_KEY = "asgn-theme";
const DEFAULT_THEME: Theme = "morandi";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial = saved && THEMES.includes(saved) ? saved : DEFAULT_THEME;
    setThemeState(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  function setTheme(t: Theme) {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    document.documentElement.dataset.theme = t;
  }

  return { theme, setTheme };
}
