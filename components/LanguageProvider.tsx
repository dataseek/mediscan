"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  AVAILABLE_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  detectPreferredLocale,
  getMessages,
  resolveLocale,
  t,
  type Locale
} from "@/lib/i18n";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (path: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const savedLocale = resolveLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
    const nextLocale =
      savedLocale !== DEFAULT_LOCALE
        ? savedLocale
        : detectPreferredLocale(window.navigator.language);

    setLocaleState(nextLocale);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale: (nextLocale) => setLocaleState(resolveLocale(nextLocale)),
      t: (path) => t(locale, path)
    }),
    [locale]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider.");
  }

  return context;
}

export function useLanguageOptions() {
  const { locale, setLocale, t: translate } = useLanguage();

  return AVAILABLE_LOCALES.map((code) => ({
    code,
    label: translate(`language.options.${code}`),
    isActive: code === locale,
    onSelect: () => setLocale(code)
  }));
}

export function getLanguageDisplayName(locale: Locale) {
  return getMessages(locale).language.names[locale];
}
