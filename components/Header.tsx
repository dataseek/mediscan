"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { AccessibilityControls } from "@/components/AccessibilityControls";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MediScanLogoMark } from "@/components/MediScanLogoMark";
import { PlanBadge } from "@/components/PlanBadge";
import { useLanguage } from "@/components/LanguageProvider";

function MenuIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 text-white/50" viewBox="0 0 24 24" fill="none">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Header() {
  const { data } = useSession();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);

  const user = data?.user;
  const displayName = useMemo(() => {
    return user?.name?.trim() || user?.email?.split("@")[0] || "";
  }, [user?.email, user?.name]);

  return (
    <header className="mb-5 min-w-0 sm:mb-7">
      <div className="relative flex min-h-[86px] items-start justify-between gap-2">
        {!user ? (
          <Link
            href="/login"
            aria-label={t("header.login")}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-card)] p-0 text-[var(--app-text)] shadow-sm transition hover:bg-[var(--app-card-soft)] focus:outline-none focus:ring-4 focus:ring-medical/25"
          >
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 21a8 8 0 0 0-16 0"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 13a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        ) : (
          <div className="relative flex items-center gap-2">
            <PlanBadge plan={user.plan} />
            <button
              type="button"
              onClick={() => setIsOpen((v) => !v)}
              className="flex h-12 min-w-0 items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-card)] px-3 text-[var(--app-text)] shadow-sm transition hover:bg-[var(--app-card-soft)] focus:outline-none focus:ring-4 focus:ring-medical/25"
              aria-haspopup="menu"
              aria-expanded={isOpen}
            >
              <span className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-white/[0.08]">
                {user.image ? <Image src={user.image} alt="" width={28} height={28} className="h-full w-full object-cover" unoptimized /> : null}
              </span>
              <span className="min-w-0 max-w-[9rem] truncate text-[13px] font-semibold">{displayName}</span>
              <ChevronDownIcon />
            </button>

            {isOpen ? (
              <div
                role="menu"
                className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-56 overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-lg shadow-black/30"
              >
                <Link
                  role="menuitem"
                  href="/historial"
                  className="block px-4 py-3.5 text-[15px] font-semibold text-[var(--app-text)] hover:bg-[var(--app-card-soft)]"
                  onClick={() => setIsOpen(false)}
                >
                  {t("header.myHistory")}
                </Link>
                <Link
                  role="menuitem"
                  href="/cuenta"
                  className="block px-4 py-3.5 text-[15px] font-semibold text-[var(--app-text)] hover:bg-[var(--app-card-soft)]"
                  onClick={() => setIsOpen(false)}
                >
                  {t("header.myAccount")}
                </Link>
                <button
                  role="menuitem"
                  type="button"
                  className="w-full px-4 py-3.5 text-left text-[15px] font-semibold text-[var(--app-text)] hover:bg-[var(--app-card-soft)]"
                  onClick={async () => {
                    setIsOpen(false);
                    await signOut({ callbackUrl: "/" });
                  }}
                >
                  {t("header.signOut")}
                </button>
              </div>
            ) : null}
          </div>
        )}

        <div className="min-w-0 flex-1 text-center">
          <Link href="/" className="inline-flex items-center justify-center gap-x-1 rounded-xl px-1 py-1 outline-none focus:ring-2 focus:ring-medical/60">
            <MediScanLogoMark className="h-10 w-10 shrink-0 translate-y-px text-medical min-[380px]:h-11 min-[380px]:w-11" />
            <span className="text-[clamp(1.6rem,5vw+0.5rem,2.35rem)] font-bold leading-none tracking-normal">
              <span className="text-[var(--app-text-strong)]">Medi</span>
              <span className="text-medical">Scan</span>
            </span>
          </Link>
          <p className="mx-auto mt-1 max-w-[18rem] text-balance px-1 text-[13px] font-semibold leading-snug text-[var(--app-muted)] min-[380px]:max-w-[20rem] sm:text-[15px]">
            {t("header.claim")}
          </p>
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label={t("header.openMenu")}
            aria-haspopup="menu"
            aria-expanded={isHamburgerOpen}
            onClick={() => setIsHamburgerOpen((v) => !v)}
            className="flex h-12 w-12 min-h-0 max-h-12 shrink-0 items-center justify-center gap-0 rounded-full border border-[var(--app-border)] bg-[var(--app-card)] p-0 text-[var(--app-text)] shadow-sm transition hover:bg-[var(--app-card-soft)] focus:outline-none focus:ring-4 focus:ring-medical/25"
          >
            <MenuIcon />
          </button>

          {isHamburgerOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-72 overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-lg shadow-black/30"
            >
              <div className="border-b border-[var(--app-border)] px-4 py-3.5">
                <LanguageSwitcher />
              </div>
              <div className="border-b border-[var(--app-border)] px-4 py-3.5">
                <AccessibilityControls />
              </div>
              <Link
                role="menuitem"
                href="/historial"
                className="block px-4 py-3.5 text-[15px] font-semibold text-[var(--app-text)] hover:bg-[var(--app-card-soft)]"
                onClick={() => setIsHamburgerOpen(false)}
              >
                {t("header.myAnalyses")}
              </Link>
              <Link
                role="menuitem"
                href="/configuracion"
                className="block px-4 py-3.5 text-[15px] font-semibold text-[var(--app-text)] hover:bg-[var(--app-card-soft)]"
                onClick={() => setIsHamburgerOpen(false)}
              >
                {t("header.settings")}
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
