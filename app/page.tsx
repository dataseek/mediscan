"use client";

import { useCallback, useEffect, useState } from "react";
import { AnalysisResult } from "@/components/AnalysisResult";
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

async function readAnalyzeResponse(response: Response): Promise<AnalyzeApiResponse> {
  const text = await response.text();

  if (!text.trim()) {
    return { error: "No pudimos leer la respuesta del servidor." };
  }

  try {
    return JSON.parse(text) as AnalyzeApiResponse;
  } catch {
    return { error: text.slice(0, 240) || "La respuesta del servidor no fue valida." };
  }
}

export default function HomePage() {
  const { locale, t } = useLanguage();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileLoadedAtMs, setFileLoadedAtMs] = useState<number | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedPreview = window.sessionStorage.getItem("mediscan-last-preview");
      const storedFileName = window.sessionStorage.getItem("mediscan-last-filename");
      const storedLoadedAt = window.sessionStorage.getItem("mediscan-last-fileLoadedAtMs");
      const storedResult = window.sessionStorage.getItem("mediscan-last-result");

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
      window.sessionStorage.setItem("mediscan-last-preview", previewUrl);
      if (fileName) {
        window.sessionStorage.setItem("mediscan-last-filename", fileName);
      }
      if (fileLoadedAtMs) {
        window.sessionStorage.setItem("mediscan-last-fileLoadedAtMs", String(fileLoadedAtMs));
      }
    } else {
      window.sessionStorage.removeItem("mediscan-last-preview");
      window.sessionStorage.removeItem("mediscan-last-filename");
      window.sessionStorage.removeItem("mediscan-last-fileLoadedAtMs");
    }
  }, [fileLoadedAtMs, fileName, previewUrl]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      if (result) {
        window.sessionStorage.setItem("mediscan-last-result", JSON.stringify({ locale, result }));
      } else {
        window.sessionStorage.removeItem("mediscan-last-result");
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

  const handleClear = useCallback(() => {
    setPreviewUrl(null);
    setFileName(null);
    setFileLoadedAtMs(null);
    setResult(null);
    setError(null);
    try {
      window.sessionStorage.removeItem("mediscan-last-especialidad");
      window.sessionStorage.removeItem("mediscan-last-result");
    } catch {
      // ignore storage failures
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!previewUrl) {
      setError(t("home.selectStudyFirst"));
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

      const data = await readAnalyzeResponse(response);

      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : t("home.analyzeFailed"));
      }

      try {
        window.sessionStorage.setItem("mediscan-last-especialidad", data.result.especialidad);
      } catch {
        // ignore storage failures (private mode / disabled storage)
      }
      setResult(data.result);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t("home.analyzeFailed"));
    } finally {
      setIsAnalyzing(false);
    }
  }, [locale, previewUrl, t]);

  return (
    <main className="relative box-border mx-auto flex min-h-screen w-full max-w-none flex-col bg-ink pb-[max(6rem,env(safe-area-inset-bottom,0px))] pl-[max(0.9rem,env(safe-area-inset-left,0px))] pr-[max(0.9rem,env(safe-area-inset-right,0px))] pt-[max(0.75rem,env(safe-area-inset-top,0px))] text-[var(--app-text)] antialiased sm:max-w-2xl sm:px-5 sm:pb-8 sm:pt-5 lg:max-w-5xl lg:px-8 xl:max-w-6xl">
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
              onError={setError}
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
              <div
                className="min-w-0 max-w-full break-words rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-[13px] leading-relaxed text-red-100 min-[380px]:text-sm sm:text-[15px]"
                role="alert"
              >
                {error}
              </div>
            ) : null}

            {isAnalyzing ? <LoadingSkeleton /> : null}
          </div>

          <div className="min-w-0">{result ? <AnalysisResult result={result} previewUrl={previewUrl} /> : null}</div>
        </div>

      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-none border-t border-[var(--app-border)] bg-[var(--app-card)] px-5 py-2.5 shadow-[0_-10px_30px_rgba(18,55,95,0.10)] sm:hidden">
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
