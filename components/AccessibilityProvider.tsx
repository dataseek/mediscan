"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type TextScale = "normal" | "large" | "xlarge";
type ThemeMode = "light" | "dark";

interface AccessibilityContextValue {
  textScale: TextScale;
  setTextScale: (scale: TextScale) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const TEXT_SCALE_STORAGE_KEY = "mediscan-text-scale";
const THEME_MODE_STORAGE_KEY = "mediscan-theme-mode";
const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);
const textZoomByScale: Record<TextScale, string> = {
  normal: "1",
  large: "1.12",
  xlarge: "1.24"
};

function isTextScale(value: string | null): value is TextScale {
  return value === "normal" || value === "large" || value === "xlarge";
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark";
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [textScale, setTextScaleState] = useState<TextScale>("normal");
  const [themeMode, setThemeModeState] = useState<ThemeMode>("light");

  useEffect(() => {
    const savedScale = window.localStorage.getItem(TEXT_SCALE_STORAGE_KEY);
    const savedTheme = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);

    if (isTextScale(savedScale)) {
      setTextScaleState(savedScale);
    }

    if (isThemeMode(savedTheme)) {
      setThemeModeState(savedTheme);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.textScale = textScale;
    document.documentElement.style.setProperty("--mediscan-text-zoom", textZoomByScale[textScale]);
    window.localStorage.setItem(TEXT_SCALE_STORAGE_KEY, textScale);
  }, [textScale]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
  }, [themeMode]);

  const setTextScale = useCallback((scale: TextScale) => {
    setTextScaleState(scale);
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
  }, []);

  const value = useMemo(
    () => ({
      textScale,
      setTextScale,
      themeMode,
      setThemeMode
    }),
    [setTextScale, setThemeMode, textScale, themeMode]
  );

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);

  if (!context) {
    throw new Error("useAccessibility must be used inside AccessibilityProvider.");
  }

  return context;
}
