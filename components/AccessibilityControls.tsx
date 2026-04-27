"use client";

import { useAccessibility } from "@/components/AccessibilityProvider";
import { useLanguage } from "@/components/LanguageProvider";

const textScaleOptions = [
  { value: "normal", labelPath: "accessibility.textNormal" },
  { value: "large", labelPath: "accessibility.textLarge" },
  { value: "xlarge", labelPath: "accessibility.textXLarge" }
] as const;

export function AccessibilityControls() {
  const { t } = useLanguage();
  const { textScale, setTextScale, themeMode, setThemeMode } = useAccessibility();

  return (
    <div className="space-y-3">
      <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--app-faint)]">{t("accessibility.title")}</p>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label={t("accessibility.textSizeAriaLabel")}>
        {textScaleOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`min-h-[44px] rounded-2xl px-2 text-[13px] font-bold transition focus:outline-none focus:ring-2 focus:ring-medical/60 ${
              textScale === option.value
                ? "bg-medical text-white"
                : "border border-[var(--app-border)] bg-[var(--app-card-soft)] text-[var(--app-text)] hover:bg-[var(--app-card-muted)]"
            }`}
            aria-pressed={textScale === option.value}
            onClick={() => setTextScale(option.value)}
          >
            {t(option.labelPath)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label={t("accessibility.themeAriaLabel")}>
        <button
          type="button"
          className={`min-h-[44px] rounded-2xl px-3 text-[13px] font-bold transition focus:outline-none focus:ring-2 focus:ring-medical/60 ${
            themeMode === "light"
              ? "bg-medical text-white"
              : "border border-[var(--app-border)] bg-[var(--app-card-soft)] text-[var(--app-text)] hover:bg-[var(--app-card-muted)]"
          }`}
          aria-pressed={themeMode === "light"}
          onClick={() => setThemeMode("light")}
        >
          {t("accessibility.lightMode")}
        </button>
        <button
          type="button"
          className={`min-h-[44px] rounded-2xl px-3 text-[13px] font-bold transition focus:outline-none focus:ring-2 focus:ring-medical/60 ${
            themeMode === "dark"
              ? "bg-medical text-white"
              : "border border-[var(--app-border)] bg-[var(--app-card-soft)] text-[var(--app-text)] hover:bg-[var(--app-card-muted)]"
          }`}
          aria-pressed={themeMode === "dark"}
          onClick={() => setThemeMode("dark")}
        >
          {t("accessibility.darkMode")}
        </button>
      </div>
      <p className="text-[13px] leading-relaxed text-[var(--app-muted)]">{t("accessibility.textSizeHint")}</p>
    </div>
  );
}
