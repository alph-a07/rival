import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ThemeContext,
  STORAGE_KEY,
  getInitialTheme,
  type Theme,
  type ThemeContextValue,
} from "@/theme/ThemeContext";

/** Theme wrapper component. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(STORAGE_KEY, theme);

    const meta = document.getElementById("theme-color-meta");
    if (meta) {
      const bg = getComputedStyle(document.documentElement)
        .getPropertyValue("--bg-background")
        .trim();
      meta.setAttribute("content", bg);
    }
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: setThemeState,
      toggleTheme: () => setThemeState((prev) => (prev === "dark" ? "light" : "dark")),
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
