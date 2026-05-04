import translations from "@/lib/translations.json";

export type Locale = keyof typeof translations;

export const DEFAULT_LOCALE: Locale = "es";
export const LOCALE_STORAGE_KEY = "medicscan-locale";
export const AVAILABLE_LOCALES = Object.keys(translations) as Locale[];

type TranslationTree = (typeof translations)[Locale];

function getNestedValue(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, source);
}

export function isLocale(value: string | null | undefined): value is Locale {
  return typeof value === "string" && AVAILABLE_LOCALES.includes(value as Locale);
}

export function resolveLocale(value: string | null | undefined): Locale {
  if (isLocale(value)) {
    return value;
  }

  return DEFAULT_LOCALE;
}

export function getMessages(locale: Locale): TranslationTree {
  return translations[resolveLocale(locale)];
}

export function t(locale: Locale, path: string): string {
  const value = getNestedValue(getMessages(locale), path) ?? getNestedValue(getMessages(DEFAULT_LOCALE), path);

  if (typeof value !== "string") {
    throw new Error(`Missing translation string at path "${path}" for locale "${locale}".`);
  }

  return value;
}

export function tList(locale: Locale, path: string): string[] {
  const value = getNestedValue(getMessages(locale), path) ?? getNestedValue(getMessages(DEFAULT_LOCALE), path);

  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`Missing translation list at path "${path}" for locale "${locale}".`);
  }

  return value;
}

export function detectPreferredLocale(input: string | null | undefined): Locale {
  if (!input) {
    return DEFAULT_LOCALE;
  }

  const lowered = input.toLowerCase();

  if (lowered.startsWith("pt")) {
    return "pt";
  }

  if (lowered.startsWith("en")) {
    return "en";
  }

  return "es";
}

export function detectLocaleFromTimezone(timeZone: string | null | undefined): Locale | null {
  if (!timeZone) {
    return null;
  }

  const normalized = timeZone.toLowerCase();
  const ptZones = ["america/sao_paulo", "america/fortaleza", "america/recife", "america/belem", "america/manaus", "america/cuiaba", "america/porto_velho"];
  if (ptZones.includes(normalized)) {
    return "pt";
  }

  const enZones = ["america/new_york", "america/chicago", "america/denver", "america/los_angeles", "america/phoenix"];
  if (enZones.includes(normalized)) {
    return "en";
  }

  return null;
}
