import { createContext, useContext } from "react";

/** Canonical theme options. */
export const THEMES = ["dark", "light"] as const;

export type Theme = (typeof THEMES)[number];

export const STORAGE_KEY = "rival-theme";

/** Interface for the theme context values. */
export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

/** Context for managing the theme (dark/light) across the application. */
export const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Get the initial theme from localStorage or default to dark theme. */
export function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "dark";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") {
    return stored;
  }

  return "dark";
}

/** Hook to access the theme context. */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
