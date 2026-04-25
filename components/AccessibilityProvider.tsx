"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type TextScale = "normal" | "large" | "xlarge";

interface AccessibilityContextValue {
  textScale: TextScale;
  setTextScale: (scale: TextScale) => void;
}

const TEXT_SCALE_STORAGE_KEY = "mediscan-text-scale";
const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);
const textZoomByScale: Record<TextScale, string> = {
  normal: "1",
  large: "1.12",
  xlarge: "1.24"
};

function isTextScale(value: string | null): value is TextScale {
  return value === "normal" || value === "large" || value === "xlarge";
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [textScale, setTextScaleState] = useState<TextScale>("normal");

  useEffect(() => {
    const savedScale = window.localStorage.getItem(TEXT_SCALE_STORAGE_KEY);

    if (isTextScale(savedScale)) {
      setTextScaleState(savedScale);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.textScale = textScale;
    document.documentElement.style.setProperty("--mediscan-text-zoom", textZoomByScale[textScale]);
    window.localStorage.setItem(TEXT_SCALE_STORAGE_KEY, textScale);
  }, [textScale]);

  const setTextScale = useCallback((scale: TextScale) => {
    setTextScaleState(scale);
  }, []);

  const value = useMemo(
    () => ({
      textScale,
      setTextScale
    }),
    [setTextScale, textScale]
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
