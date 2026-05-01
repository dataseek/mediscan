"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

const installDismissedKey = "mediscan-pwa-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none">
      <path d="M12 4v10M7.5 9.5 12 14l4.5-4.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 18.5h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none">
      <path d="M20 6v5h-5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 18v-5h5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.2 10A7 7 0 0 0 6.6 6.8L4 9.2M5.8 14a7 7 0 0 0 11.6 3.2L20 14.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Banner({
  icon,
  title,
  body,
  action,
  dismissLabel,
  onAction,
  onDismiss,
  tone
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action: string;
  dismissLabel: string;
  onAction: () => void;
  onDismiss: () => void;
  tone: "install" | "update";
}) {
  const toneClass =
    tone === "install"
      ? "border-emerald-300/25 bg-[#081d1a]/95 text-emerald-50 shadow-emerald-950/30"
      : "border-sky-300/25 bg-[#091828]/95 text-sky-50 shadow-sky-950/30";
  const buttonClass = tone === "install" ? "bg-medical hover:bg-medicalHover" : "bg-[#2f7cf6] hover:bg-[#2264cb]";

  return (
    <section className={`rounded-2xl border p-3.5 shadow-2xl backdrop-blur ${toneClass}`}>
      <div className="flex min-w-0 gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <h2 className="text-[15px] font-extrabold leading-tight text-white">{title}</h2>
            <button
              type="button"
              aria-label={dismissLabel}
              onClick={onDismiss}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/15"
            >
              <CloseIcon />
            </button>
          </div>
          <p className="mt-1 text-[13px] font-semibold leading-snug text-white/72">{body}</p>
          <button
            type="button"
            onClick={onAction}
            className={`mt-3 min-h-[42px] rounded-2xl px-4 text-[13px] font-extrabold text-white shadow-lg shadow-black/20 transition focus:outline-none focus:ring-4 focus:ring-white/15 ${buttonClass}`}
          >
            {action}
          </button>
        </div>
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
          icon={<RefreshIcon />}
          title={t("pwa.updateTitle")}
          body={t("pwa.updateBody")}
          action={t("pwa.updateAction")}
          dismissLabel={t("pwa.dismiss")}
          onAction={update}
          onDismiss={dismissUpdate}
          tone="update"
        />
      ) : null}
      {showInstall ? (
        <Banner
          icon={<DownloadIcon />}
          title={t("pwa.installTitle")}
          body={t("pwa.installBody")}
          action={t("pwa.installAction")}
          dismissLabel={t("pwa.dismiss")}
          onAction={install}
          onDismiss={dismissInstall}
          tone="install"
        />
      ) : null}
    </div>
  );
}
