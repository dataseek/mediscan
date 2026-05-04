"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

const installDismissedKey = "medicscan-pwa-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Banner({
  title,
  body,
  action,
  dismissLabel,
  onAction,
  onDismiss
}: {
  title: string;
  body: string;
  action: string;
  dismissLabel: string;
  onAction: () => void;
  onDismiss: () => void;
}) {
  return (
    <section className="relative rounded-[0.95rem] border border-emerald-300/25 bg-[#10231f] px-3.5 py-3.5 text-white shadow-[0_20px_44px_rgba(0,0,0,0.34)] backdrop-blur sm:px-4">
      <button
        type="button"
        aria-label={dismissLabel}
        onClick={onDismiss}
        className="absolute right-3 top-3 flex h-8 w-8 min-h-0 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/78 transition hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/15"
      >
        <CloseIcon />
      </button>

      <div className="min-w-0 pr-10">
        <h2 className="text-[16px] font-extrabold leading-tight text-white">{title}</h2>
        <p className="mt-4 max-w-[18rem] text-[13px] font-extrabold leading-snug text-white/90">{body}</p>
        <button
          type="button"
          onClick={onAction}
          className="mt-3 min-h-[44px] rounded-2xl bg-[#63a983] px-5 text-[14px] font-extrabold text-white shadow-sm transition hover:bg-[#559675] focus:outline-none focus:ring-4 focus:ring-white/15"
        >
          {action}
        </button>
      </div>
    </section>
  );
}

export function PwaBanners() {
  const { t } = useLanguage();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [waitingRegistration, setWaitingRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    if (isStandalone() || window.localStorage.getItem(installDismissedKey) === "1") {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setShowInstall(true);
    };
    const handleInstalled = () => {
      setShowInstall(false);
      setInstallPrompt(null);
      window.localStorage.setItem(installDismissedKey, "1");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    let mounted = true;
    const hadController = Boolean(navigator.serviceWorker.controller);

    const showRegistrationUpdate = (registration: ServiceWorkerRegistration) => {
      if (!mounted || !navigator.serviceWorker.controller) return;
      setWaitingRegistration(registration);
      setShowUpdate(true);
    };

    const handleControllerChange = () => {
      if (!mounted || !hadController) return;
      setShowUpdate(true);
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    navigator.serviceWorker
      .getRegistration()
      .then((registration) => {
        if (!registration || !mounted) return;

        if (registration.waiting) {
          showRegistrationUpdate(registration);
        }

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;

          worker.addEventListener("statechange", () => {
            if (worker.state === "installed") {
              showRegistrationUpdate(registration);
            }
          });
        });
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      window.localStorage.setItem(installDismissedKey, "1");
      setShowInstall(false);
      setInstallPrompt(null);
    }
  }, [installPrompt]);

  const dismissInstall = useCallback(() => {
    window.localStorage.setItem(installDismissedKey, "1");
    setShowInstall(false);
  }, []);

  const update = useCallback(() => {
    waitingRegistration?.waiting?.postMessage({ type: "SKIP_WAITING" });
    window.location.reload();
  }, [waitingRegistration]);

  const dismissUpdate = useCallback(() => {
    setShowUpdate(false);
  }, []);

  if (!showInstall && !showUpdate) {
    return null;
  }

  return (
    <div className="fixed inset-x-3 bottom-[5.9rem] z-50 mx-auto grid max-w-md gap-2 sm:bottom-4 sm:right-4 sm:left-auto sm:w-[22rem]">
      {showUpdate ? (
        <Banner
          title={t("pwa.updateTitle")}
          body={t("pwa.updateBody")}
          action={t("pwa.updateAction")}
          dismissLabel={t("pwa.dismiss")}
          onAction={update}
          onDismiss={dismissUpdate}
        />
      ) : null}
      {showInstall ? (
        <Banner
          title={t("pwa.installTitle")}
          body={t("pwa.installBody")}
          action={t("pwa.installAction")}
          dismissLabel={t("pwa.dismiss")}
          onAction={install}
          onDismiss={dismissInstall}
        />
      ) : null}
    </div>
  );
}
