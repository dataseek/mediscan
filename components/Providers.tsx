"use client";

import { SessionProvider } from "next-auth/react";
import { AccessibilityProvider } from "@/components/AccessibilityProvider";
import { DevServiceWorkerCleanup } from "@/components/DevServiceWorkerCleanup";
import { LanguageProvider } from "@/components/LanguageProvider";
import { PwaBanners } from "@/components/PwaBanners";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AccessibilityProvider>
        <DevServiceWorkerCleanup />
        <SessionProvider>
          {children}
          <PwaBanners />
        </SessionProvider>
      </AccessibilityProvider>
    </LanguageProvider>
  );
}
