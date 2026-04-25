"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/components/LanguageProvider";
import { MediScanLogoMark } from "@/components/MediScanLogoMark";

export default function LoginPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="relative box-border mx-auto flex min-h-screen w-full max-w-[min(26.25rem,calc(100vw-1.25rem))] flex-col bg-ink pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))] pt-[max(0.75rem,env(safe-area-inset-top,0px))] text-white antialiased sm:max-w-[26.25rem] sm:px-5 sm:pb-8 sm:pt-8">
      <div className="min-w-0 space-y-5">
        <div className="flex justify-end">
          <LanguageSwitcher compact />
        </div>

        <div className="flex items-center justify-center">
          <MediScanLogoMark className="h-11 w-11 text-medical" />
        </div>

        <div className="space-y-2">
          <h1 className="text-[22px] font-semibold tracking-[-0.04em]">{t("login.title")}</h1>
          <p className="text-[13px] leading-relaxed text-[#9aa3b2]">{t("login.subtitle")}</p>
        </div>

        <button
          type="button"
          className="flex h-12 w-full items-center justify-center rounded-2xl border border-white/[0.10] bg-panelMuted px-4 text-[14px] font-semibold text-white/95 transition hover:bg-panelSoft focus:outline-none focus:ring-2 focus:ring-medical/60"
          onClick={() => void signIn("google", { callbackUrl: "/" })}
        >
          {t("login.continueWithGoogle")}
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="h-px w-full bg-white/[0.08]" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-ink px-3 text-[11px] font-medium text-white/50">{t("login.orByEmail")}</span>
          </div>
        </div>

        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setIsSending(true);
            try {
              const trimmed = email.trim();
              if (!trimmed) {
                setError(t("login.typeEmail"));
                return;
              }
              await signIn("resend", { email: trimmed, callbackUrl: "/" });
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : t("login.sendLinkFailed"));
            } finally {
              setIsSending(false);
            }
          }}
        >
          <label className="block text-[12px] font-medium text-white/80">
            {t("login.emailLabel")}
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={t("login.emailPlaceholder")}
              className="mt-2 h-12 w-full rounded-2xl border border-white/[0.10] bg-panelMuted px-4 text-[14px] text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-medical/50"
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-3 text-[13px] text-red-100" role="alert">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSending}
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-medical px-4 text-[14px] font-semibold text-white shadow-sm shadow-black/20 transition hover:bg-medicalHover focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:opacity-60"
          >
            {isSending ? t("login.sendingLink") : t("login.sendMagicLink")}
          </button>
        </form>
      </div>
    </main>
  );
}
