"use client";

import { useCallback, useEffect, useState } from "react";
import { AnalysisResult } from "@/components/AnalysisResult";
import { ErrorNotice } from "@/components/ErrorNotice";
import { Header } from "@/components/Header";
import { ImageUploader } from "@/components/ImageUploader";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useLanguage } from "@/components/LanguageProvider";
import type { AnalysisResponse, AnalyzeApiResponse } from "@/lib/types";
import { splitImageDataUrl } from "@/lib/utils";

function SpinnerIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function AnalyzeIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
      <path d="M4 18V6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M4 18h16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M7.5 15v-3.8M12 15V9M16.5 15v-6.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21s7-3.4 7-10.1V5.8L12 3 5 5.8v5.1C5 17.6 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M8.7 12.1h6.6M12 8.8v6.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

interface FriendlyError {
  title: string;
  message: string;
  canRetry?: boolean;
}

async function readAnalyzeResponse(response: Response, fallbackMessage: string): Promise<AnalyzeApiResponse> {
  const text = await response.text();

  if (!text.trim()) {
    return { error: fallbackMessage };
  }

  try {
    return JSON.parse(text) as AnalyzeApiResponse;
  } catch {
    return { error: fallbackMessage };
  }
}

export default function HomePage() {
  const { locale, t } = useLanguage();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileLoadedAtMs, setFileLoadedAtMs] = useState<number | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<FriendlyError | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedPreview = window.sessionStorage.getItem("medicscan-last-preview");
      const storedFileName = window.sessionStorage.getItem("medicscan-last-filename");
      const storedLoadedAt = window.sessionStorage.getItem("medicscan-last-fileLoadedAtMs");
      const storedResult = window.sessionStorage.getItem("medicscan-last-result");

      if (storedPreview) {
        setPreviewUrl(storedPreview);
      }
      if (storedFileName) {
        setFileName(storedFileName);
      }
      if (storedLoadedAt) {
        const parsed = Number(storedLoadedAt);
        if (Number.isFinite(parsed) && parsed > 0) {
          setFileLoadedAtMs(parsed);
        }
      }

      if (storedResult) {
        const parsed = JSON.parse(storedResult) as { locale?: string; result?: AnalysisResponse };
        if (parsed?.locale === locale && parsed?.result) {
          setResult(parsed.result);
        }
      }
    } catch {
      // ignore storage failures / invalid data
    }
  }, [locale]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (previewUrl) {
      window.sessionStorage.setItem("medicscan-last-preview", previewUrl);
      if (fileName) {
        window.sessionStorage.setItem("medicscan-last-filename", fileName);
      }
      if (fileLoadedAtMs) {
        window.sessionStorage.setItem("medicscan-last-fileLoadedAtMs", String(fileLoadedAtMs));
      }
    } else {
      window.sessionStorage.removeItem("medicscan-last-preview");
      window.sessionStorage.removeItem("medicscan-last-filename");
      window.sessionStorage.removeItem("medicscan-last-fileLoadedAtMs");
    }
  }, [fileLoadedAtMs, fileName, previewUrl]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      if (result) {
        window.sessionStorage.setItem("medicscan-last-result", JSON.stringify({ locale, result }));
      } else {
        window.sessionStorage.removeItem("medicscan-last-result");
      }
    } catch {
      // ignore storage failures
    }
  }, [locale, result]);

  const handleImageSelected = useCallback((dataUrl: string, selectedFileName: string, lastModified: number) => {
    setPreviewUrl(dataUrl);
    setFileName(selectedFileName);
    setFileLoadedAtMs(Number.isFinite(lastModified) && lastModified > 0 ? lastModified : Date.now());
    setResult(null);
    setError(null);
  }, []);

  const handleUploadError = useCallback(
    (message: string) => {
      setError({
        title: t("home.uploadErrorTitle"),
        message,
        canRetry: false
      });
    },
    [t]
  );

  const handleClear = useCallback(() => {
    setPreviewUrl(null);
    setFileName(null);
    setFileLoadedAtMs(null);
    setResult(null);
    setError(null);
    try {
      window.sessionStorage.removeItem("medicscan-last-especialidad");
      window.sessionStorage.removeItem("medicscan-last-result");
    } catch {
      // ignore storage failures
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!previewUrl) {
      setError({
        title: t("home.uploadErrorTitle"),
        message: t("home.selectStudyFirst"),
        canRetry: false
      });
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const { imageBase64, mimeType } = splitImageDataUrl(previewUrl);
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ imageBase64, mimeType, locale })
      });

      const data = await readAnalyzeResponse(response, t("home.serverResponseFailed"));

      if (!response.ok || "error" in data) {
        if (response.status === 504) {
          throw new Error(t("home.timeoutFailed"));
        }

        if (response.status >= 500) {
          throw new Error(t("home.serverBusy"));
        }

        throw new Error("error" in data ? data.error : t("home.analyzeFailed"));
      }

      try {
        window.sessionStorage.setItem("medicscan-last-especialidad", data.result.especialidad);
      } catch {
        // ignore storage failures (private mode / disabled storage)
      }
      setResult(data.result);
    } catch (caughtError) {
      const message =
        caughtError instanceof TypeError
          ? t("home.networkFailed")
          : caughtError instanceof Error
            ? caughtError.message
            : t("home.analyzeFailed");

      setError({
        title: t("home.analysisErrorTitle"),
        message,
        canRetry: true
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [locale, previewUrl, t]);

  return (
    <main className="relative box-border mx-auto flex min-h-screen w-full max-w-none flex-col bg-ink pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pl-[max(0.9rem,env(safe-area-inset-left,0px))] pr-[max(0.9rem,env(safe-area-inset-right,0px))] pt-[max(0.75rem,env(safe-area-inset-top,0px))] text-[var(--app-text)] antialiased sm:max-w-2xl sm:px-5 sm:pb-8 sm:pt-5 lg:max-w-5xl lg:px-8 xl:max-w-6xl">
      <Header />

      <div className="min-h-0 min-w-0 flex-1 space-y-4 sm:space-y-5 lg:space-y-6">
        <div className="min-w-0 space-y-4 sm:space-y-5 lg:space-y-6">
          <div className="min-w-0 space-y-4 sm:space-y-5">
            <ImageUploader
              previewUrl={previewUrl}
              fileName={fileName}
              fileLoadedAtMs={fileLoadedAtMs}
              onImageSelected={handleImageSelected}
              onClear={handleClear}
              onError={handleUploadError}
              disabled={isAnalyzing}
            />

            {previewUrl && !result ? (
              <button
                type="button"
                className="relative flex min-h-[58px] w-full min-w-0 items-center justify-center overflow-hidden rounded-3xl bg-medical px-4 text-[17px] font-bold leading-tight text-white shadow-lg shadow-black/20 transition hover:bg-medicalHover focus:outline-none focus:ring-4 focus:ring-emerald-400/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-80 sm:min-h-[62px] sm:text-lg"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                aria-busy={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <span className="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-white/10">
                      <span className="block h-full w-1/2 animate-[loading-slide_1.15s_ease-in-out_infinite] rounded-full bg-white/55" />
                    </span>
                    <span className="relative z-10 inline-flex items-center gap-2">
                      <SpinnerIcon />
                      {t("home.analyzingStudy")}
                    </span>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-2.5">
                    <AnalyzeIcon />
                    {t("home.analyzeStudy")}
                  </span>
                )}
              </button>
            ) : null}

            {error ? (
              <ErrorNotice
                title={error.title}
                message={error.message}
                primaryAction={error.canRetry && previewUrl && !isAnalyzing ? handleAnalyze : undefined}
                primaryLabel={error.canRetry && previewUrl && !isAnalyzing ? t("home.retryAnalyze") : undefined}
                dismissLabel={t("home.dismissError")}
                onDismiss={() => setError(null)}
                tone={error.canRetry ? "danger" : "warning"}
              />
            ) : null}

            {isAnalyzing ? <LoadingSkeleton /> : null}
          </div>

          <div className="min-w-0">{result ? <AnalysisResult result={result} previewUrl={previewUrl} /> : null}</div>
        </div>

      </div>
      <nav className="hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2 text-center text-[12px] font-bold text-[var(--app-muted)]">
          <a href="/" className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-2xl text-[var(--app-medical)]">
            <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
              <path d="M4 11.5 12 4l8 7.5v7a1.5 1.5 0 0 1-1.5 1.5H15v-5.5H9V20H5.5A1.5 1.5 0 0 1 4 18.5v-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
            Inicio
          </a>
          <a href="/historial" className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-2xl">
            <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
              <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Historial
          </a>
          <a href="/cuenta" className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-2xl">
            <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
              <path d="M20 21a8 8 0 0 0-16 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M12 13a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            Perfil
          </a>
        </div>
      </nav>

      <section className="mt-4 flex min-w-0 gap-3 rounded-[1.35rem] border border-[var(--app-border-strong)] bg-[var(--app-card)] p-4 text-[13px] font-normal leading-relaxed text-[var(--app-text)] shadow-[var(--app-shadow)] sm:text-base">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <ShieldIcon />
        </div>
        <p className="min-w-0 self-center">{t("result.disclaimerBody")}</p>
      </section>
    </main>
  );
}
