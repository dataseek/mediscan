"use client";

import { SessionProvider } from "next-auth/react";
import { AccessibilityProvider } from "@/components/AccessibilityProvider";
import { LanguageProvider } from "@/components/LanguageProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AccessibilityProvider>
        <SessionProvider>{children}</SessionProvider>
      </AccessibilityProvider>
    </LanguageProvider>
  );
}
