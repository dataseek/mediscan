"use client";

import { useLanguage, useLanguageOptions } from "@/components/LanguageProvider";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { t } = useLanguage();
  const options = useLanguageOptions();

  return (
    <div className={compact ? "inline-flex items-center gap-2" : "space-y-2"}>
      {!compact ? <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--app-faint)]">{t("language.label")}</p> : null}
      <div
        className="inline-flex items-center gap-2"
        role="group"
        aria-label={t("language.switcherAriaLabel")}
      >
        {options.map((option) => (
          <button
            key={option.code}
            type="button"
            onClick={option.onSelect}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border p-0 text-[12px] font-bold leading-none transition sm:h-12 sm:w-12 sm:text-sm ${
              option.isActive
                ? "border-medical bg-medical text-white shadow-sm shadow-medical/20"
                : "border-[var(--app-border)] bg-[var(--app-card-soft)] text-[var(--app-text)] hover:bg-[var(--app-card-muted)]"
            }`}
            aria-pressed={option.isActive}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
