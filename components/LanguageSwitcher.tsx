"use client";

import { useLanguage, useLanguageOptions } from "@/components/LanguageProvider";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { t } = useLanguage();
  const options = useLanguageOptions();

  return (
    <div className={compact ? "inline-flex items-center gap-2" : "space-y-2"}>
      {!compact ? <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8b95a8]">{t("language.label")}</p> : null}
      <div
        className="inline-flex rounded-full border border-white/[0.08] bg-panelMuted p-1"
        role="group"
        aria-label={t("language.switcherAriaLabel")}
      >
        {options.map((option) => (
          <button
            key={option.code}
            type="button"
            onClick={option.onSelect}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-0 text-[11px] font-semibold leading-none transition sm:h-10 sm:w-10 sm:text-xs ${
              option.isActive ? "bg-medical text-white" : "text-white/70 hover:bg-white/[0.06]"
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
