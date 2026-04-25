"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { MediScanLogoMark } from "@/components/MediScanLogoMark";
import { PlanBadge } from "@/components/PlanBadge";

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
  const [isOpen, setIsOpen] = useState(false);
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);

  const user = data?.user;
  const displayName = useMemo(() => {
    return user?.name?.trim() || user?.email?.split("@")[0] || "";
  }, [user?.email, user?.name]);

  return (
    <header className="mb-4 min-w-0 sm:mb-6">
      <div className="relative flex min-h-[52px] items-center justify-between gap-0">
        {/* Left: login (or user dropdown when logged in) */}
        {!user ? (
          <Link
            href="/login"
            aria-label="Ingresar"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.10] bg-panel/70 p-0 text-white/90 transition hover:bg-panel focus:outline-none focus:ring-2 focus:ring-medical/60"
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
              className="flex h-10 min-w-0 items-center gap-2 rounded-full border border-white/[0.10] bg-panel/70 px-2.5 text-white/90 transition hover:bg-panel focus:outline-none focus:ring-2 focus:ring-medical/60"
              aria-haspopup="menu"
              aria-expanded={isOpen}
            >
              <span className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-white/[0.08]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {user.image ? <img src={user.image} alt="" className="h-full w-full object-cover" /> : null}
              </span>
              <span className="min-w-0 max-w-[9rem] truncate text-[13px] font-semibold">{displayName}</span>
              <ChevronDownIcon />
            </button>

            {isOpen ? (
              <div
                role="menu"
                className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-56 overflow-hidden rounded-2xl border border-white/[0.10] bg-[#07111b] shadow-lg shadow-black/30"
              >
                <Link
                  role="menuitem"
                  href="/historial"
                  className="block px-4 py-3 text-[13px] text-white/90 hover:bg-white/[0.06]"
                  onClick={() => setIsOpen(false)}
                >
                  Mi historial
                </Link>
                <Link
                  role="menuitem"
                  href="/cuenta"
                  className="block px-4 py-3 text-[13px] text-white/90 hover:bg-white/[0.06]"
                  onClick={() => setIsOpen(false)}
                >
                  Mi cuenta
                </Link>
                <button
                  role="menuitem"
                  type="button"
                  className="w-full px-4 py-3 text-left text-[13px] text-white/90 hover:bg-white/[0.06]"
                  onClick={async () => {
                    setIsOpen(false);
                    await signOut({ callbackUrl: "/" });
                  }}
                >
                  Cerrar sesión
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* Center: logo */}
        <div className="min-w-0 flex-1 text-center">
          <Link href="/" className="inline-flex items-center justify-center gap-x-1 rounded-xl px-1 py-1 outline-none focus:ring-2 focus:ring-medical/60">
            <MediScanLogoMark className="h-8 w-8 shrink-0 translate-y-px text-medical min-[380px]:h-9 min-[380px]:w-9" />
            <span className="text-[clamp(1.125rem,4.2vw+0.35rem,1.5rem)] font-semibold leading-none tracking-[-0.04em]">
              <span className="text-white">Medi</span>
              <span className="text-medical">Scan</span>
            </span>
          </Link>
        </div>

        {/* Right: hamburger */}
        <div className="relative">
          <button
            type="button"
            aria-label="Abrir menú"
            aria-haspopup="menu"
            aria-expanded={isHamburgerOpen}
            onClick={() => setIsHamburgerOpen((v) => !v)}
            className="flex h-10 w-10 min-h-0 max-h-10 shrink-0 items-center justify-center gap-0 rounded-full p-0 text-white/90 transition hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-medical/60"
          >
            <MenuIcon />
          </button>

          {isHamburgerOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 overflow-hidden rounded-2xl border border-white/[0.10] bg-[#07111b] shadow-lg shadow-black/30"
            >
              <Link
                role="menuitem"
                href="/historial"
                className="block px-4 py-3 text-[13px] text-white/90 hover:bg-white/[0.06]"
                onClick={() => setIsHamburgerOpen(false)}
              >
                Mis análisis
              </Link>
              <Link
                role="menuitem"
                href="/configuracion"
                className="block px-4 py-3 text-[13px] text-white/90 hover:bg-white/[0.06]"
                onClick={() => setIsHamburgerOpen(false)}
              >
                Configuración
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

