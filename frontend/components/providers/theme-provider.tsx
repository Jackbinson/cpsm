"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getUserProfile, saveUserProfile, type ThemePreference } from "@/lib/user-preferences";

interface ThemeContextValue { theme: ThemePreference; resolvedTheme: "light" | "dark"; setTheme: (theme: ThemePreference) => void; }
const ThemeContext = createContext<ThemeContextValue | null>(null);

const resolveTheme = (theme: ThemePreference) => theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const profile = getUserProfile();
    setThemeState(profile.theme);
    const apply = (preference: ThemePreference) => {
      const resolved = resolveTheme(preference);
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
      setResolvedTheme(resolved);
    };
    apply(profile.theme);
    const listener = () => { if (theme === "system") apply("system"); };
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [theme]);

  const setTheme = (nextTheme: ThemePreference) => {
    const profile = getUserProfile();
    saveUserProfile({ ...profile, theme: nextTheme });
    setThemeState(nextTheme);
  };

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider.");
  return context;
}