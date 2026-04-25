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
  const { textScale, setTextScale } = useAccessibility();

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8b95a8]">{t("accessibility.title")}</p>
      <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={t("accessibility.textSizeAriaLabel")}>
        {textScaleOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`min-h-[38px] rounded-xl px-2 text-[12px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-medical/60 ${
              textScale === option.value ? "bg-medical text-white" : "bg-white/[0.05] text-white/75 hover:bg-white/[0.08]"
            }`}
            aria-pressed={textScale === option.value}
            onClick={() => setTextScale(option.value)}
          >
            {t(option.labelPath)}
          </button>
        ))}
      </div>
      <p className="text-[12px] leading-relaxed text-[#9aa3b2]">{t("accessibility.textSizeHint")}</p>
    </div>
  );
}
