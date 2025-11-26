import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export type ShikiTheme = "github-light" | "github-dark";

export interface CodeBlockThemeColors {
  background: string;
  border: string;
  addedBackground: string;
  removedBackground: string;
  unchangedBackground: string;
  gutterBackground: string;
}

const LIGHT_THEME_COLORS: CodeBlockThemeColors = {
  background: "#ffffff",
  border: "#d0d7de",
  addedBackground: "#e6f3e6",
  removedBackground: "#ffebe9",
  unchangedBackground: "#ffffff",
  gutterBackground: "#f6f8fa",
};

const DARK_THEME_COLORS: CodeBlockThemeColors = {
  background: "#0d1117",
  border: "#21262d",
  addedBackground: "#1a4d2e",
  removedBackground: "#5c1a1a",
  unchangedBackground: "#0d1117",
  gutterBackground: "#0d1117",
};

/**
 * Hook to get the current code block theme based on the app's light/dark mode
 * @returns Object containing the Shiki theme name and theme colors
 */
export function useCodeBlockTheme() {
  const { theme, resolvedTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Determine if we're in dark mode
    const checkDarkMode = () => {
      if (resolvedTheme) {
        return resolvedTheme === "dark";
      }
      if (theme === "system") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
      }
      return theme === "dark";
    };

    setIsDark(checkDarkMode());

    // Listen for system theme changes when using "system" theme
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        setIsDark(mediaQuery.matches);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, resolvedTheme]);

  return {
    shikiTheme: (isDark ? "github-dark" : "github-light") as ShikiTheme,
    colors: isDark ? DARK_THEME_COLORS : LIGHT_THEME_COLORS,
    isDark,
  };
}

/**
 * Get the Shiki theme for non-React contexts (synchronous)
 * @returns The Shiki theme name based on current DOM state
 */
export function getShikiTheme(): ShikiTheme {
  const isDark =
    document.documentElement.classList.contains("dark") ||
    (localStorage.getItem("theme") === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches) ||
    localStorage.getItem("theme") === "dark";

  return isDark ? "github-dark" : "github-light";
}

/**
 * Get theme colors for non-React contexts (synchronous)
 * @returns The theme colors based on current DOM state
 */
export function getThemeColors(): CodeBlockThemeColors {
  const isDark =
    document.documentElement.classList.contains("dark") ||
    (localStorage.getItem("theme") === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches) ||
    localStorage.getItem("theme") === "dark";

  return isDark ? DARK_THEME_COLORS : LIGHT_THEME_COLORS;
}
