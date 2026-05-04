"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccessibility } from "@/components/AccessibilityProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { MedicScanLogoMark } from "@/components/MedicScanLogoMark";
import { PrescriptionSupport } from "@/components/PrescriptionSupport";
import type { AnalysisResponse, MedicalValue } from "@/lib/types";
import { splitExplanationIntoParagraphs } from "@/lib/utils";

const FAMILY_PHONE_STORAGE_KEY = "medicscan-family-phone";

function preferredSpeechLang(locale: string) {
  if (locale === "pt") return "pt-BR";
  if (locale === "en") return "en-US";
  return "es-AR";
}

function pickVoice(lang: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return undefined;
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices?.length) return undefined;

  const normalized = lang.toLowerCase();
  const exact = voices.find((voice) => voice.lang?.toLowerCase() === normalized);
  if (exact) return exact;

  const prefix = normalized.split("-")[0];
  return voices.find((voice) => voice.lang?.toLowerCase().startsWith(`${prefix}-`));
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-white/35 min-[380px]:h-5 min-[380px]:w-5" viewBox="0 0 24 24" fill="none">
      <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SummaryIcon() {
  return (
    <svg aria-hidden="true" className="h-[26px] w-[33px] shrink-0" viewBox="0 0 24 24" fill="none">
      <path d="M7 3.8h7l3 3v13.4H7V3.8Z" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round" />
      <path d="M14 3.8v3h3M9 10h5M9 13.5h6M9 17h4" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg aria-hidden="true" className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none">
      <path d="M5 4v16h15" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      <path d="M8.2 16V9.5M12 16V6.5M15.8 16v-4.5M19.5 16V8" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg aria-hidden="true" className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none">
      <path d="M9.4 9.2a3 3 0 0 1 5.8 1.2c0 2.8-3.2 2.6-3.2 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M12 19h.01" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" strokeWidth="1.65" />
    </svg>
  );
}

function StethoscopeIcon() {
  return (
    <svg aria-hidden="true" className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none">
      <path d="M6 4v5a4 4 0 0 0 8 0V4" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      <path d="M10 13v2.8a4.2 4.2 0 0 0 8.4 0V14" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      <path d="M18.4 14.2a2.1 2.1 0 1 0 0-4.2 2.1 2.1 0 0 0 0 4.2Z" stroke="currentColor" strokeWidth="1.65" />
      <path d="M4.5 4h3M12.5 4h3" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  );
}

function PillIcon() {
  return (
    <svg aria-hidden="true" className="h-7 w-7" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 3.8h6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M8 7.2c0-1.2 1-2.2 2.2-2.2h3.6c1.2 0 2.2 1 2.2 2.2v12c0 1.3-1 2.3-2.3 2.3h-3.4c-1.3 0-2.3-1-2.3-2.3v-12Z"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      <path
        d="M9.4 11.2h5.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M12 8.6v5.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function normalizeValueLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function SpeakerIcon() {
  return (
    <svg aria-hidden="true" className="h-7 w-7" viewBox="0 0 24 24" fill="none">
      <path d="M4 10v4h3l5 4V6l-5 4H4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M16 9.2a4 4 0 0 1 0 5.6M18.5 6.8a7.5 7.5 0 0 1 0 10.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ArrowRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none">
      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const resultCardArticleClass =
  "grid min-w-0 max-w-full grid-cols-[52px_minmax(0,1fr)_20px] items-start gap-x-3 gap-y-3 rounded-[1.35rem] border border-[var(--app-border-strong)] bg-[var(--app-card)] p-4 shadow-[var(--app-shadow)] min-[380px]:grid-cols-[56px_minmax(0,1fr)_20px] min-[380px]:gap-x-3.5 sm:grid-cols-[60px_minmax(0,1fr)_22px] sm:gap-x-4 sm:p-5";

function ResultCard({
  icon,
  iconClassName,
  title,
  children,
  prose = false,
  className,
  animationDelayMs
}: {
  icon: React.ReactNode;
  iconClassName: string;
  title: string;
  children: React.ReactNode;
  prose?: boolean;
  className?: string;
  animationDelayMs?: number;
}) {
  return (
    <article
      className={`${resultCardArticleClass} ${className ?? ""} animate-fadeIn [will-change:transform,opacity]`}
      style={animationDelayMs ? { animationDelay: `${animationDelayMs}ms` } : undefined}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl min-[380px]:h-14 min-[380px]:w-14 sm:h-[58px] sm:w-[58px] ${iconClassName}`}
      >
        {icon}
      </div>
      <div className="min-w-0 self-center pt-0.5">
        <h3 className="break-words text-[17px] font-bold leading-tight text-[var(--app-text-strong)] min-[380px]:text-lg sm:text-xl">
          {title}
        </h3>
      </div>
      <div className="flex h-12 items-center justify-end self-center pt-0.5 min-[380px]:h-14 sm:h-[58px]">
        <ChevronIcon />
      </div>
      <div className="col-span-3 mt-2 min-w-0 min-[380px]:mt-2.5 sm:mt-3">
        {prose ? (
          children
        ) : (
          <div className="min-w-0 break-words text-base leading-relaxed text-[var(--app-muted)]">
            {children}
          </div>
        )}
      </div>
    </article>
  );
}

function valueState(value: MedicalValue, translate: (path: string) => string) {
  if (value.estado === "normal") {
    return {
      dot: "bg-[#22c58a]",
      label: translate("result.status.readable"),
      badgeClassName: "bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-300/20"
    };
  }

  if (value.estado === "atencion") {
    return {
      dot: "bg-[#e8c547]",
      label: translate("result.status.confirm"),
      badgeClassName: "bg-amber-400/15 text-amber-100 ring-1 ring-amber-300/20"
    };
  }

  return {
    dot: "bg-[#ff5d5d]",
    label: translate("result.status.unreadable"),
    badgeClassName: "bg-red-500/15 text-red-100 ring-1 ring-red-300/20"
  };
}

export function AnalysisResult({ result, previewUrl }: { result: AnalysisResponse; previewUrl: string | null }) {
  const { locale, t } = useLanguage();
  const { voiceMode } = useAccessibility();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [familyPhone, setFamilyPhone] = useState<string | null>(null);
  const explanationParts = splitExplanationIntoParagraphs(result.explicacion_general);
  const explanationBlocks = explanationParts.length > 0 ? explanationParts : [result.explicacion_general];
  const isPrescription = result.especialidad === "RECETA_MEDICA";
  const isMedicationDoc = result.especialidad === "MEDICAMENTO";
  let cardIndex = 0;
  const nextDelay = () => 60 + cardIndex++ * 90;
  const speechText = useMemo(() => {
    const values = isPrescription
      ? result.valores
          .slice(0, 5)
          .map((value) => `${value.nombre}. ${value.valor}. ${value.explicacion}`)
          .join(". ")
      : result.valores
          .slice(0, 6)
          .map((value) => `${value.nombre}. ${value.valor}. ${value.explicacion}`)
          .join(". ");
    const questions = result.preguntas_medico.slice(0, 5).join(". ");

    return [
      result.tipo_estudio,
      result.resumen,
      values,
      result.explicacion_general,
      questions ? `${t("result.questionsTitle")}. ${questions}` : "",
      result.disclaimer || t("result.disclaimerBody")
    ]
      .filter(Boolean)
      .join(". ");
  }, [isPrescription, result, t]);

  const handleSpeak = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(speechText);
    const speechLang = preferredSpeechLang(locale);
    utterance.lang = speechLang;
    const voice = pickVoice(speechLang);
    if (voice) {
      utterance.voice = voice;
    }
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [locale, speechText]);

  useEffect(() => {
    if (voiceMode === "off" && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [voiceMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(FAMILY_PHONE_STORAGE_KEY);
      setFamilyPhone(stored ? stored.trim() : null);
    } catch {
      setFamilyPhone(null);
    }
  }, []);

  const shareText = useMemo(() => {
    const lines: string[] = [];
    lines.push("MedicScan — resumen para revisar con un profesional.");
    if (result.tipo_estudio) lines.push(`Documento: ${result.tipo_estudio}`);
    if (result.resumen) lines.push(`Resumen: ${result.resumen}`);
    const values = result.valores?.slice(0, 6) ?? [];
    if (values.length > 0) {
      lines.push("Datos/valores:");
      for (const item of values) {
        const parts = [item.nombre, item.valor].filter(Boolean).join(": ");
        lines.push(`- ${parts}`);
      }
    }
    const questions = result.preguntas_medico?.slice(0, 5) ?? [];
    if (questions.length > 0) {
      lines.push("Preguntas sugeridas:");
      for (const q of questions) lines.push(`- ${q}`);
    }
    if (result.disclaimer) lines.push(result.disclaimer);
    return lines.join("\n");
  }, [result]);

  const handleShare = useCallback(async () => {
    if (typeof window === "undefined") return;

    if (!familyPhone) {
      window.location.href = "/configuracion";
      return;
    }

    const phoneDigits = familyPhone.replace(/[^\d]/g, "");
    const encoded = encodeURIComponent(shareText);
    const whatsappUrl = `https://wa.me/${phoneDigits}?text=${encoded}`;

    window.open(whatsappUrl, "_blank", "noreferrer");
  }, [familyPhone, shareText]);

  return (
    <section className="min-w-0 space-y-3.5 sm:space-y-4" aria-live="polite">
      {voiceMode === "on" ? (
        <button
          type="button"
          className="flex min-h-[58px] w-full items-center justify-center gap-2.5 rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-card-muted)] px-4 text-[17px] font-bold text-[var(--app-text-strong)] transition hover:bg-[var(--app-card-soft)] focus:outline-none focus:ring-4 focus:ring-medical/25"
          onClick={handleSpeak}
        >
          <SpeakerIcon />
          {isSpeaking ? t("accessibility.stopReading") : t("accessibility.readResult")}
        </button>
      ) : null}

      {result.urgencia === "urgente" ? (
        <div
          className="min-w-0 max-w-full rounded-2xl border border-red-400/35 bg-red-500/12 p-4 text-red-100 animate-fadeIn [will-change:transform,opacity]"
          style={{ animationDelay: "0ms" }}
        >
          <p className="break-words text-base font-semibold">{t("result.urgentTitle")}</p>
          <p className="mt-1.5 break-words text-base leading-relaxed">{t("result.urgentBody")}</p>
        </div>
      ) : null}

      <ResultCard icon={<SummaryIcon />} iconClassName="bg-[#0d3d32] text-[#3dd4a5]" title={t("result.summaryTitle")} animationDelayMs={nextDelay()}>
        {result.resumen}
      </ResultCard>

      {!isPrescription ? (
        <ResultCard
          icon={<ChartIcon />}
          iconClassName="bg-[#0d3d32] text-[#3dd4a5]"
          title={t("result.valuesTitle")}
          animationDelayMs={nextDelay()}
        >
          {result.valores.length > 0 ? (
            <>
              {isMedicationDoc && previewUrl ? (
                <div className="mb-3 flex justify-center min-[380px]:justify-start">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.06] sm:h-[5.5rem] sm:w-[5.5rem]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                </div>
              ) : null}
            <ul className="divide-y divide-white/[0.06]">
              {result.valores.slice(0, 6).map((value, index) => {
                const state = valueState(value, t);
                const displayText = (value.valor ?? "").trim() || (value.explicacion ?? "").trim();
                const explanationText = (value.explicacion ?? "").trim();

                return (
                  <li
                    key={`${value.nombre}-${index}`}
                    className="flex flex-col gap-2 py-2.5 first:pt-0 last:pb-0"
                  >
                    {/* Ancho completo primero: evita que flex-row comprima el título a una “columna” de una letra. */}
                    <div className="w-full min-w-0 max-w-full space-y-1">
                      <p className="text-pretty break-words text-base font-semibold leading-snug text-white">
                        {value.nombre}
                      </p>
                      {isMedicationDoc ? (
                        displayText ? (
                          <p className="text-pretty break-words text-base font-semibold leading-snug text-[#3dd4a5]">
                            {displayText}
                          </p>
                        ) : (
                          <p className="text-pretty break-words text-base leading-snug text-[#8b95a8]">—</p>
                        )
                      ) : null}
                      {isMedicationDoc && explanationText && explanationText !== displayText ? (
                        <p className="text-pretty break-words text-[15px] leading-relaxed text-[#b4bcc9]">
                          {explanationText}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${state.dot}`} aria-hidden />
                        <span
                          className={`inline-flex max-w-full min-w-0 items-center rounded-full px-2.5 py-1 text-[12px] font-semibold leading-snug whitespace-normal sm:whitespace-nowrap ${state.badgeClassName}`}
                        >
                          {state.label}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            </>
          ) : (
            <p>{t("result.noValues")}</p>
          )}
        </ResultCard>
      ) : null}

      {isPrescription ? (
        <ResultCard
          icon={<ChartIcon />}
          iconClassName="bg-[#0d3d32] text-[#3dd4a5]"
          title={t("result.prescriptionValuesTitle")}
          animationDelayMs={nextDelay()}
          prose
        >
          {result.valores.length > 0 ? (
            <div className="space-y-3">
              <ul className="space-y-2.5">
                {result.valores.slice(0, 6).map((value, index) => {
                  const state = valueState(value, t);
                  const normalizedLabel = normalizeValueLabel(value.nombre);
                  const showMedicationDetailLink =
                    normalizedLabel !== "indicacion de toma" &&
                    normalizedLabel !== "indicaciones de toma" &&
                    normalizedLabel !== "profesional que prescribe";

                  return (
                    <li key={`${value.nombre}-${index}`} className="rounded-xl border border-white/[0.06] bg-[#0a121c]/85 p-3">
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <div className="flex min-w-0 items-start gap-3">
                          {showMedicationDetailLink ? (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.06] text-white/70">
                              <PillIcon />
                            </div>
                          ) : null}
                          <div className="min-w-0">
                            <p className="min-w-0 break-words text-base font-semibold leading-snug text-white">{value.nombre}</p>
                            {showMedicationDetailLink ? (
                              <Link
                                href={`/medicamento?nombre=${encodeURIComponent(value.nombre)}&valor=${encodeURIComponent(
                                  value.valor ?? ""
                                )}&explicacion=${encodeURIComponent(value.explicacion ?? "")}`}
                                className="mt-2 inline-flex items-center gap-1 text-[13px] font-extrabold text-[#3dd4a5] transition hover:text-[#6ef2c6] focus:outline-none focus:ring-4 focus:ring-medical/20"
                              >
                                Ver info <ArrowRightIcon className="h-4 w-4" />
                              </Link>
                            ) : null}
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-base font-semibold leading-none ${state.badgeClassName}`}>
                          {state.label}
                        </span>
                      </div>
                      {value.valor ? (
                        <p className="mt-2 break-words text-base font-semibold leading-snug text-[#3dd4a5]">
                          {value.valor}
                        </p>
                      ) : null}
                      <p className="mt-2 break-words text-base leading-relaxed text-[#b4bcc9]">
                        {value.explicacion}
                      </p>
                    </li>
                  );
                })}
              </ul>
              <p className="rounded-xl border border-amber-300/20 bg-amber-400/10 p-3 text-base font-semibold leading-relaxed text-amber-100">
                {t("result.prescriptionVerifyDoctor")}
              </p>
            </div>
          ) : (
            <p className="text-base leading-relaxed text-[#b4bcc9]">{t("result.noPrescriptionValues")}</p>
          )}
        </ResultCard>
      ) : null}

      <ResultCard
        icon={<QuestionIcon />}
        iconClassName="bg-[#3b3525] text-[#ffcc45]"
        title={isPrescription ? t("result.prescriptionMeaningTitle") : t("result.meaningTitle")}
        className="border-dotted"
        prose
        animationDelayMs={nextDelay()}
      >
        <div className="w-full max-w-full overflow-x-hidden rounded-lg border border-white/[0.04] bg-[#0a121c]/90 py-3.5 pl-3 pr-2.5 sm:py-5 sm:pl-5 sm:pr-4">
          <div className="space-y-4 border-l-[3px] border-[#c9a227]/35 pl-3 sm:space-y-6 sm:pl-5" role="region" aria-label={t("result.meaningRegion")}>
            {explanationBlocks.map((paragraph, index) => (
              <p
                key={index}
                className="hyphens-auto text-pretty text-base font-normal leading-[1.75] tracking-[0.01em] text-[#dce3ec]"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </ResultCard>

      <ResultCard
        icon={<StethoscopeIcon />}
        iconClassName="bg-[#16335d] text-[#69a0ff]"
        title={t("result.questionsTitle")}
        animationDelayMs={nextDelay()}
      >
        <ul className="list-disc space-y-1.5 pl-[1.1rem] marker:text-[#8b95a8]">
          {result.preguntas_medico.slice(0, 5).map((question, index) => (
            <li key={`${question}-${index}`} className="pl-0.5 text-base leading-snug">
              {question}
            </li>
          ))}
        </ul>
      </ResultCard>

      {isPrescription || isMedicationDoc ? <PrescriptionSupport medications={result.valores} /> : null}

      <button
        type="button"
        onClick={handleShare}
        className="flex min-h-[58px] w-full items-center justify-center gap-2.5 rounded-[1.35rem] bg-medical px-4 text-[16px] font-extrabold text-white shadow-lg shadow-black/20 transition hover:bg-medicalHover focus:outline-none focus:ring-4 focus:ring-medical/25 active:scale-[0.99]"
      >
        {t("share.button")} <ArrowRightIcon className="h-4 w-4" />
      </button>
    </section>
  );
}
