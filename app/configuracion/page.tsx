"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

const FAMILY_PHONE_STORAGE_KEY = "medicscan-family-phone";

function normalizeWhatsAppPhone(input: string) {
  return input.replace(/[^\d+]/g, "").replace(/^\+/, "").trim();
}

export default function ConfiguracionPage() {
  const { t } = useLanguage();
  const [rawPhone, setRawPhone] = useState("");
  const normalized = useMemo(() => normalizeWhatsAppPhone(rawPhone), [rawPhone]);
  const isValid = normalized.length >= 8;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(FAMILY_PHONE_STORAGE_KEY) ?? "";
      setRawPhone(stored);
    } catch {
      setRawPhone("");
    }
  }, []);

  const handleSave = () => {
    try {
      if (!normalized) {
        window.localStorage.removeItem(FAMILY_PHONE_STORAGE_KEY);
        return;
      }
      window.localStorage.setItem(FAMILY_PHONE_STORAGE_KEY, normalized);
    } catch {
      // ignore storage failures
    }
  };

  return (
    <main className="relative box-border mx-auto flex min-h-screen w-full max-w-none flex-col bg-ink pb-[max(6rem,env(safe-area-inset-bottom,0px))] pl-[max(0.9rem,env(safe-area-inset-left,0px))] pr-[max(0.9rem,env(safe-area-inset-right,0px))] pt-[max(0.75rem,env(safe-area-inset-top,0px))] text-[var(--app-text)] antialiased sm:max-w-2xl sm:px-5 sm:pb-8 sm:pt-5 lg:max-w-5xl lg:px-8 xl:max-w-6xl">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-card)] px-4 py-3 text-base font-bold text-[var(--app-text-strong)] transition hover:bg-[var(--app-card-soft)] focus:outline-none focus:ring-4 focus:ring-medical/25"
      >
        ← {t("settingsPage.back")}
      </Link>

      <section className="mt-4 min-w-0 space-y-4 rounded-[1.35rem] border border-[var(--app-border-strong)] bg-[var(--app-card)] p-4 shadow-[var(--app-shadow)] sm:p-5 lg:p-6">
        <h1 className="break-words text-xl font-extrabold text-[var(--app-text-strong)]">{t("settingsPage.title")}</h1>
        <p className="text-[14px] leading-relaxed text-[var(--app-muted)]">{t("settingsPage.familyPhoneHint")}</p>

        <div className="space-y-2">
          <label className="text-[13px] font-bold text-[var(--app-text-strong)]">{t("settingsPage.familyPhoneLabel")}</label>
          <input
            value={rawPhone}
            onChange={(event) => setRawPhone(event.target.value)}
            inputMode="tel"
            placeholder={t("settingsPage.familyPhonePlaceholder")}
            className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3 text-[15px] font-semibold text-[var(--app-text)] outline-none focus:ring-4 focus:ring-medical/25"
          />
          <p className="text-[12px] text-[var(--app-muted)]">{t("settingsPage.familyPhoneExample")}</p>
          {!isValid && normalized ? (
            <p className="text-[12px] font-semibold text-amber-200">{t("settingsPage.familyPhoneInvalid")}</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="inline-flex min-h-[46px] w-full items-center justify-center rounded-2xl bg-medical px-4 text-[15px] font-extrabold text-white transition hover:bg-medicalHover focus:outline-none focus:ring-4 focus:ring-medical/25 disabled:opacity-60"
          disabled={Boolean(normalized) && !isValid}
        >
          {t("settingsPage.save")}
        </button>
      </section>
    </main>
  );
}

