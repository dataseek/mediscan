"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { fileToDataUrl, formatFileLoadedAtParts } from "@/lib/utils";

interface ImageUploaderProps {
  previewUrl: string | null;
  fileName: string | null;
  fileLoadedAtMs: number | null;
  onImageSelected: (dataUrl: string, fileName: string, lastModified: number) => void;
  onClear: () => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

const acceptedFileTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/heic", "image/heif", "application/pdf"];
type ImageQualityIssue = "tooDark" | "tooBright" | "lowContrast" | "tooSmall" | "notSharp" | "unreadable";
type ImageQuality =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "sharp" }
  | { status: "review" | "blurry"; issue: ImageQualityIssue };

function getImageQuality(dataUrl: string): Promise<ImageQuality> {
  return new Promise((resolve) => {
    const image = new window.Image();

    image.onload = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;

      if (width <= 0 || height <= 0) {
        resolve({ status: "blurry", issue: "unreadable" });
        return;
      }

      const canvas = document.createElement("canvas");
      const maxSide = 320;
      const scale = Math.min(1, maxSide / Math.max(width, height));
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));

      const context = canvas.getContext("2d", { willReadFrequently: true });

      if (!context) {
        resolve({ status: "review", issue: "unreadable" });
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = canvas.width * canvas.height;
      const gray = new Float32Array(pixels);
      let sum = 0;

      for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
        const value = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        gray[p] = value;
        sum += value;
      }

      const mean = sum / pixels;
      let contrastSum = 0;

      for (let i = 0; i < gray.length; i += 1) {
        const diff = gray[i] - mean;
        contrastSum += diff * diff;
      }

      const contrast = Math.sqrt(contrastSum / pixels);
      let laplacianSum = 0;
      let laplacianSqSum = 0;
      let laplacianCount = 0;

      for (let y = 1; y < canvas.height - 1; y += 1) {
        for (let x = 1; x < canvas.width - 1; x += 1) {
          const idx = y * canvas.width + x;
          const laplacian =
            gray[idx - canvas.width] +
            gray[idx - 1] +
            gray[idx + 1] +
            gray[idx + canvas.width] -
            gray[idx] * 4;

          laplacianSum += laplacian;
          laplacianSqSum += laplacian * laplacian;
          laplacianCount += 1;
        }
      }

      const laplacianMean = laplacianCount > 0 ? laplacianSum / laplacianCount : 0;
      const sharpness = laplacianCount > 0 ? laplacianSqSum / laplacianCount - laplacianMean * laplacianMean : 0;
      const tooSmall = Math.min(width, height) < 520;
      const tooDark = mean < 35;
      const tooBright = mean > 235;
      const lowContrast = contrast < 18;

      if (sharpness < 20) {
        resolve({ status: "blurry", issue: "notSharp" });
        return;
      }

      if (tooDark && lowContrast) {
        resolve({ status: "blurry", issue: "tooDark" });
        return;
      }

      if (tooBright && lowContrast) {
        resolve({ status: "blurry", issue: "tooBright" });
        return;
      }

      if (sharpness < 55) {
        resolve({ status: "review", issue: "notSharp" });
        return;
      }

      if (tooDark) {
        resolve({ status: "review", issue: "tooDark" });
        return;
      }

      if (tooBright) {
        resolve({ status: "review", issue: "tooBright" });
        return;
      }

      if (lowContrast) {
        resolve({ status: "review", issue: "lowContrast" });
        return;
      }

      if (tooSmall) {
        resolve({ status: "review", issue: "tooSmall" });
        return;
      }

      resolve({ status: "sharp" });
    };

    image.onerror = () => resolve({ status: "blurry", issue: "unreadable" });
    image.src = dataUrl;
  });
}

function CameraIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0 sm:h-[22px] sm:w-[22px]" viewBox="0 0 24 24" fill="none">
      <path
        d="M8.5 6.5 10 4.5h4l1.5 2H18a2.5 2.5 0 0 1 2.5 2.5v8A2.5 2.5 0 0 1 18 19.5H6A2.5 2.5 0 0 1 3.5 17V9A2.5 2.5 0 0 1 6 6.5h2.5Z"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 16a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 12 16Z" stroke="currentColor" strokeWidth="1.85" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0 sm:h-[22px] sm:w-[22px]" viewBox="0 0 24 24" fill="none">
      <path d="M12 15V4.5" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" />
      <path d="m7.5 9 4.5-4.5L16.5 9" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M5 14.5v3A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-3"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg aria-hidden="true" className="h-8 w-8 text-red-100" viewBox="0 0 24 24" fill="none">
      <path d="M7 3.5h6.2L18 8.3v12.2H7V3.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M13 3.8V8.5h4.7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8.9 14.5h6.2M8.9 17.2h4.1M8.9 11.8h4.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M8 4H6.5A2.5 2.5 0 0 0 4 6.5V8M16 4h1.5A2.5 2.5 0 0 1 20 6.5V8M8 20H6.5A2.5 2.5 0 0 1 4 17.5V16M16 20h1.5a2.5 2.5 0 0 0 2.5-2.5V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 12h8M9.5 9h5M9.5 15h3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SummaryIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M7 7h10M7 12h7M7 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[#8b95a8]" viewBox="0 0 24 24" fill="none">
      <path d="M7 3.8v3M17 3.8v3M4.5 9.5h15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path
        d="M6.5 5.5h11A2.5 2.5 0 0 1 20 8v10a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18V8a2.5 2.5 0 0 1 2.5-2.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path d="M8 13h.01M12 13h.01M16 13h.01M8 16.5h.01M12 16.5h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function HowItWorks() {
  const { t } = useLanguage();
  const steps = [
    {
      title: t("howItWorks.step1Title"),
      body: t("howItWorks.step1Body"),
      icon: <ScanIcon />,
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-medical/22 dark:text-emerald-100 dark:ring-medical/25"
    },
    {
      title: t("howItWorks.step2Title"),
      body: t("howItWorks.step2Body"),
      icon: <ClockIcon />,
      className: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/18 dark:text-blue-100 dark:ring-blue-300/20"
    },
    {
      title: t("howItWorks.step3Title"),
      body: t("howItWorks.step3Body"),
      icon: <SummaryIcon />,
      className: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/18 dark:text-orange-100 dark:ring-orange-300/20"
    }
  ];

  return (
    <section aria-label={t("howItWorks.title")} className="min-w-0 rounded-[1.65rem] border border-[var(--app-border)] bg-[var(--app-card)] px-4 py-4 shadow-[var(--app-shadow)] sm:px-5 sm:py-5">
      <div className="space-y-3.5 sm:space-y-4">
        {steps.map((step, index) => (
          <div key={step.title} className="min-w-0">
            <div className="flex min-w-0 gap-3 sm:gap-4">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-1 sm:h-16 sm:w-16 ${step.className}`}>
                {step.icon}
              </div>
              <div className="min-w-0 pt-0.5">
                <h2 className="text-[17px] font-bold leading-snug text-[var(--app-text-strong)] sm:text-lg">{step.title}</h2>
                <p className="mt-1.5 text-[15px] font-medium leading-relaxed text-[var(--app-muted)] sm:text-base">{step.body}</p>
              </div>
            </div>
            {index < steps.length - 1 ? <div className="ml-[4.25rem] mt-3.5 h-px bg-[var(--app-border)] sm:ml-20 sm:mt-4" /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
      <path d="m5 12.5 4.1 4.1L19 6.8" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function ImageUploader({
  previewUrl,
  fileName,
  fileLoadedAtMs,
  onImageSelected,
  onClear,
  onError,
  disabled = false
}: ImageUploaderProps) {
  const { locale, t } = useLanguage();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [imageQuality, setImageQuality] = useState<ImageQuality>({ status: "idle" });
  const fileLoadedAtParts = fileLoadedAtMs != null ? formatFileLoadedAtParts(fileLoadedAtMs, locale) : null;
  const isPdf = previewUrl?.startsWith("data:application/pdf;") ?? false;

  useEffect(() => {
    let cancelled = false;

    if (!previewUrl) {
      setImageQuality({ status: "idle" });
      return;
    }

    if (previewUrl.startsWith("data:application/pdf;")) {
      setImageQuality({ status: "sharp" });
      return;
    }

    setImageQuality({ status: "checking" });

    getImageQuality(previewUrl).then((quality) => {
      if (!cancelled) {
        setImageQuality(quality);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [previewUrl]);

  const qualityTag = useMemo(() => {
    switch (imageQuality.status) {
      case "checking":
        return {
          label: t("uploader.qualityChecking"),
          className: "bg-white/10 text-white/80",
          iconClassName: "animate-pulse"
        };
      case "review":
        return {
          label: t(`uploader.qualityIssues.${imageQuality.issue}`),
          className: "bg-amber-400/15 text-amber-100 ring-1 ring-amber-300/20",
          iconClassName: ""
        };
      case "blurry":
        return {
          label: t(`uploader.qualityIssues.${imageQuality.issue}`),
          className: "bg-red-500/15 text-red-100 ring-1 ring-red-300/20",
          iconClassName: ""
        };
      case "sharp":
      default:
        return {
          label: isPdf ? t("uploader.pdfLoaded") : t("uploader.sharpImage"),
          className: "bg-medical/95 text-white",
          iconClassName: ""
        };
    }
  }, [imageQuality, isPdf, t]);

  const analyzableTag = useMemo(() => {
    switch (imageQuality.status) {
      case "checking":
      case "idle":
        return {
          label: t("uploader.analyzableChecking"),
          className: "bg-white/10 text-white/70 ring-1 ring-white/10"
        };
      case "blurry":
        return {
          label: t("uploader.notAnalyzable"),
          className: "bg-red-500/15 text-red-100 ring-1 ring-red-300/20"
        };
      case "review":
        return {
          label: t("uploader.analyzableWithCaution"),
          className: "bg-amber-400/15 text-amber-100 ring-1 ring-amber-300/20"
        };
      case "sharp":
      default:
        return {
          label: t("uploader.analyzable"),
          className: "bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-300/20"
        };
    }
  }, [imageQuality.status, t]);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) {
        return;
      }

      if (!acceptedFileTypes.includes(file.type)) {
        onError(t("uploader.invalidFormat"));
        return;
      }

      if (file.size > 12 * 1024 * 1024) {
        onError(t("uploader.tooLarge"));
        return;
      }

      try {
        const dataUrl = await fileToDataUrl(file);
        onImageSelected(dataUrl, file.name || t("uploader.fallbackStudyName"), file.lastModified);
      } catch (error) {
        onError(error instanceof Error ? error.message : t("uploader.loadFailed"));
      }
    },
    [onError, onImageSelected, t]
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      void handleFile(event.target.files?.[0]);
      event.target.value = "";
    },
    [handleFile]
  );

  return (
    <section className="min-w-0 space-y-4 sm:space-y-5">
      <input
        ref={cameraInputRef}
        className="sr-only"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleInputChange}
        disabled={disabled}
      />
      <input
        ref={galleryInputRef}
        className="sr-only"
        type="file"
        accept="image/*,application/pdf,.pdf"
        onChange={handleInputChange}
        disabled={disabled}
      />

      {!previewUrl ? <HowItWorks /> : null}

      <div className="grid gap-3 sm:gap-3.5">
        <button
          type="button"
          className="flex min-h-[62px] w-full min-w-0 items-center justify-center gap-3 rounded-[1.35rem] bg-[var(--app-primary)] px-4 text-[18px] font-bold leading-tight text-white shadow-lg shadow-black/15 transition hover:bg-[var(--app-primary-hover)] focus:outline-none focus:ring-4 focus:ring-blue-400/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[66px] sm:text-xl"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled}
        >
          <CameraIcon />
          {t("uploader.takePhoto")}
        </button>
        <button
          type="button"
          className="flex min-h-[62px] w-full min-w-0 items-center justify-center gap-3 rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-card)] px-4 text-[18px] font-bold leading-tight text-[var(--app-text-strong)] shadow-sm transition hover:bg-[var(--app-card-soft)] focus:outline-none focus:ring-4 focus:ring-medical/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[66px] sm:text-xl"
          onClick={() => galleryInputRef.current?.click()}
          disabled={disabled}
        >
          <UploadIcon />
          {t("uploader.uploadImage")}
        </button>
      </div>

      {previewUrl ? (
        <div className="space-y-2 sm:space-y-2.5">
          <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--app-faint)] sm:text-sm">{t("uploader.loadedStudy")}</p>
          <article className="relative flex min-w-0 gap-2.5 rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-card)] p-2.5 shadow-[var(--app-shadow)] min-[380px]:gap-3 min-[380px]:p-3 sm:gap-3.5 sm:p-3.5">
            <div className="relative flex h-[150px] w-[150px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/40 min-[380px]:h-[150px] min-[380px]:w-[150px] sm:h-[150px] sm:w-[150px]">
              {isPdf ? (
                <div className="flex h-full w-full flex-col items-center justify-center bg-red-500/10 px-3 text-center">
                  <PdfIcon />
                  <p className="mt-2 text-[13px] font-semibold text-white">{t("uploader.pdfPreviewTitle")}</p>
                  <p className="mt-1 text-[11px] leading-snug text-[#c5cbd5]">{t("uploader.pdfPreviewSubtitle")}</p>
                </div>
              ) : (
                <Image src={previewUrl} alt={t("uploader.previewAlt")} fill className="object-cover" unoptimized />
              )}
            </div>
            <div className="min-w-0 flex-1 py-0.5 pr-10 min-[380px]:pr-11 sm:pr-12">
              <h2 className="line-clamp-2 break-words text-[16px] font-bold leading-snug text-[var(--app-text-strong)] min-[380px]:text-[17px] sm:text-lg">
                {fileName?.replace(/\.[^.]+$/, "") || t("uploader.fallbackStudyName")}
              </h2>
              <div className="mt-2 flex min-w-0 items-start gap-1.5 text-[13px] leading-snug text-[var(--app-muted)] sm:items-center sm:text-sm">
                <CalendarIcon />
                {fileLoadedAtParts ? (
                  <span className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-1.5">
                    <span className="min-w-0 break-words">{fileLoadedAtParts.date}</span>
                    <span className="hidden text-[#6f7a8d] sm:inline" aria-hidden>
                      -
                    </span>
                    <span className="whitespace-nowrap">{fileLoadedAtParts.time}</span>
                  </span>
                ) : (
                  <span>-</span>
                )}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5 sm:mt-3">
                <div
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition sm:px-3 sm:py-1.5 sm:text-xs ${qualityTag.className}`}
                  title={t("uploader.qualityTooltip")}
                >
                  <span className={qualityTag.iconClassName}>
                    <CheckIcon />
                  </span>
                  {qualityTag.label}
                </div>
                <div
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition sm:px-3 sm:py-1.5 sm:text-xs ${analyzableTag.className}`}
                  title={t("uploader.analyzableTooltip")}
                >
                  <CheckIcon />
                  {analyzableTag.label}
                </div>
              </div>
            </div>
            <button
              type="button"
              aria-label={t("uploader.removeImage")}
              className="absolute right-1.5 top-1.5 flex h-10 w-10 min-h-0 max-h-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-panel/80 text-white/90 transition hover:bg-panel focus:outline-none focus:ring-2 focus:ring-medical/60 disabled:pointer-events-none disabled:opacity-50 min-[380px]:right-2 min-[380px]:top-2 sm:right-2.5 sm:top-2.5"
              onClick={onClear}
              disabled={disabled}
            >
              <CloseIcon />
            </button>
          </article>
        </div>
      ) : null}
    </section>
  );
}
