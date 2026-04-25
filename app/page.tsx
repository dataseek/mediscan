"use client";

import { useCallback, useState } from "react";
import { AnalysisResult } from "@/components/AnalysisResult";
import { Header } from "@/components/Header";
import { ImageUploader } from "@/components/ImageUploader";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import type { AnalysisResponse, AnalyzeApiResponse } from "@/lib/types";
import { splitImageDataUrl } from "@/lib/utils";

export default function HomePage() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileLoadedAtMs, setFileLoadedAtMs] = useState<number | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!previewUrl) {
      setError("Primero seleccioná o fotografiá un estudio.");
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
        body: JSON.stringify({ imageBase64, mimeType })
      });

      const data = (await response.json()) as AnalyzeApiResponse;

      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "No se pudo analizar la imagen.");
      }

      setResult(data.result);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No pudimos analizar el estudio. Probá nuevamente con una imagen más clara."
      );
    } finally {
      setIsAnalyzing(false);
    }
  }, [previewUrl]);

  return (
    <main className="relative box-border mx-auto flex min-h-screen w-full max-w-none flex-col bg-ink pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))] pt-[max(0.5rem,env(safe-area-inset-top,0px))] text-white antialiased sm:max-w-2xl sm:px-5 sm:pb-8 sm:pt-5 lg:max-w-4xl">
      <Header />

      <div className="min-h-0 min-w-0 flex-1 space-y-4 sm:space-y-5 lg:space-y-6">
        <div className="grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
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
                className="flex min-h-[48px] w-full min-w-0 items-center justify-center rounded-2xl bg-medical px-3 text-[14px] font-semibold leading-tight text-white shadow-sm shadow-black/20 transition hover:bg-medicalHover focus:outline-none focus:ring-2 focus:ring-emerald-400/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 min-[380px]:min-h-[52px] min-[380px]:px-4 min-[380px]:text-[15px] sm:min-h-[54px] sm:text-base"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? "Analizando estudio..." : "Analizar estudio"}
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

          <div className="min-w-0">
            {result ? <AnalysisResult result={result} /> : null}
          </div>
        </div>
      </div>
    </main>
  );
}
