"use client";

import Image from "next/image";
import { useCallback, useRef } from "react";
import { fileToDataUrl, formatFileLoadedAt } from "@/lib/utils";

interface ImageUploaderProps {
  previewUrl: string | null;
  fileName: string | null;
  fileLoadedAtMs: number | null;
  onImageSelected: (dataUrl: string, fileName: string, lastModified: number) => void;
  onClear: () => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

const acceptedImageTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/heic", "image/heif"];

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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) {
        return;
      }

      if (!acceptedImageTypes.includes(file.type)) {
        onError("Subí una imagen en formato PNG, JPG, WebP o HEIC.");
        return;
      }

      if (file.size > 12 * 1024 * 1024) {
        onError("La imagen pesa demasiado. Probá con una foto de menos de 12 MB.");
        return;
      }

      try {
        const dataUrl = await fileToDataUrl(file);
        onImageSelected(dataUrl, file.name || "estudio-medico", file.lastModified);
      } catch (error) {
        onError(error instanceof Error ? error.message : "No se pudo cargar la imagen.");
      }
    },
    [onError, onImageSelected]
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
        accept="image/*"
        onChange={handleInputChange}
        disabled={disabled}
      />

      <div className="grid gap-3 sm:gap-3.5">
        <button
          type="button"
          className="flex min-h-[48px] w-full min-w-0 items-center justify-center gap-2.5 rounded-2xl bg-medical px-3 text-[14px] font-semibold leading-tight text-white shadow-sm shadow-black/15 transition hover:bg-medicalHover focus:outline-none focus:ring-2 focus:ring-emerald-400/35 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 min-[380px]:min-h-[52px] min-[380px]:px-4 min-[380px]:text-[15px] sm:min-h-[54px] sm:gap-3 sm:text-base"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled}
        >
          <CameraIcon />
          Fotografiar estudio
        </button>
        <button
          type="button"
          className="flex min-h-[48px] w-full min-w-0 items-center justify-center gap-2.5 rounded-2xl border border-white/[0.08] bg-panelMuted px-3 text-[14px] font-semibold leading-tight text-white/95 transition hover:border-white/[0.12] hover:bg-panelSoft focus:outline-none focus:ring-2 focus:ring-medical/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 min-[380px]:min-h-[52px] min-[380px]:px-4 min-[380px]:text-[15px] sm:min-h-[54px] sm:gap-3 sm:text-base"
          onClick={() => galleryInputRef.current?.click()}
          disabled={disabled}
        >
          <UploadIcon />
          Subir imagen
        </button>
      </div>

      {previewUrl ? (
        <div className="space-y-2 sm:space-y-2.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8b95a8] sm:text-xs">Estudio cargado</p>
          <article className="relative flex min-w-0 gap-2.5 rounded-2xl border border-white/[0.06] bg-panel p-2.5 min-[380px]:gap-3 min-[380px]:p-3 sm:gap-3.5 sm:p-3.5">
            <div className="relative h-[150px] w-[150px] shrink-0 overflow-hidden rounded-xl bg-black/40 min-[380px]:h-[150px] min-[380px]:w-[150px] sm:h-[150px] sm:w-[150px]">
              <Image src={previewUrl} alt="Vista previa del estudio seleccionado" fill className="object-cover" unoptimized />
            </div>
            <div className="min-w-0 flex-1 py-0.5 pr-10 min-[380px]:pr-11 sm:pr-12">
              <h2 className="line-clamp-2 break-words text-[14px] font-semibold leading-snug text-white min-[380px]:text-[15px] sm:text-base">
                {fileName?.replace(/\.[^.]+$/, "") || "Radiografía de tórax"}
              </h2>
              <div className="mt-2 flex items-center gap-1.5 text-[12px] text-[#9aa3b2] sm:text-[13px]">
                <CalendarIcon />
                <span>
                  {fileLoadedAtMs != null ? formatFileLoadedAt(fileLoadedAtMs) : "—"}
                </span>
              </div>
              <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-medical/95 px-2.5 py-1 text-[11px] font-medium text-white sm:mt-3 sm:px-3 sm:py-1.5 sm:text-xs">
                <CheckIcon />
                Imagen nítida
              </div>
            </div>
            <button
              type="button"
              aria-label="Quitar imagen"
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
