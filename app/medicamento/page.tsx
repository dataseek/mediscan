"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

type MedicationImageResponse = {
  imageUrl: string | null;
  pageUrl: string | null;
  source: string | null;
};

export default function MedicamentoPage() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lastEspecialidad, setLastEspecialidad] = useState<string | null>(null);
  const [representativeImage, setRepresentativeImage] = useState<MedicationImageResponse | null>(null);
  const [isLoadingRepresentative, setIsLoadingRepresentative] = useState(false);

  const nombre = searchParams.get("nombre") ?? "";
  const valor = searchParams.get("valor") ?? "";
  const explicacion = searchParams.get("explicacion") ?? "";

  useEffect(() => {
    try {
      setPreviewUrl(window.sessionStorage.getItem("mediscan-last-preview"));
      setLastEspecialidad(window.sessionStorage.getItem("mediscan-last-especialidad"));
    } catch {
      setPreviewUrl(null);
      setLastEspecialidad(null);
    }
  }, []);

  const isPdf = useMemo(() => previewUrl?.startsWith("data:application/pdf") ?? false, [previewUrl]);
  const showMedicationPhoto = lastEspecialidad === "MEDICAMENTO" && Boolean(previewUrl) && !isPdf;

  useEffect(() => {
    const query = nombre.trim();
    if (!query || showMedicationPhoto) {
      setRepresentativeImage(null);
      return;
    }

    let cancelled = false;
    setIsLoadingRepresentative(true);

    void (async () => {
      try {
        const response = await fetch(`/api/medication-image?name=${encodeURIComponent(query)}`);
        const data = (await response.json()) as MedicationImageResponse;
        if (!cancelled) {
          setRepresentativeImage(data?.imageUrl ? data : null);
        }
      } catch {
        if (!cancelled) {
          setRepresentativeImage(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingRepresentative(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [nombre, showMedicationPhoto]);

  return (
    <main className="relative box-border mx-auto flex min-h-screen w-full max-w-none flex-col bg-ink pb-[max(6rem,env(safe-area-inset-bottom,0px))] pl-[max(0.9rem,env(safe-area-inset-left,0px))] pr-[max(0.9rem,env(safe-area-inset-right,0px))] pt-[max(0.75rem,env(safe-area-inset-top,0px))] text-[var(--app-text)] antialiased sm:max-w-2xl sm:px-5 sm:pb-8 sm:pt-5 lg:max-w-5xl lg:px-8 xl:max-w-6xl">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-card)] px-4 py-3 text-base font-bold text-[var(--app-text-strong)] transition hover:bg-[var(--app-card-soft)] focus:outline-none focus:ring-4 focus:ring-medical/25"
      >
        ← {t("header.myAnalyses")}
      </Link>

      <section className="mt-4 min-w-0 space-y-4 rounded-[1.35rem] border border-[var(--app-border-strong)] bg-[var(--app-card)] p-4 shadow-[var(--app-shadow)] sm:p-5 lg:p-6">
        <h1 className="break-words text-xl font-extrabold text-[var(--app-text-strong)]">{nombre || "Medicamento"}</h1>

        {showMedicationPhoto ? (
          <div className="h-[300px] overflow-hidden rounded-3xl border border-[var(--app-border)] bg-white/[0.04]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl ?? ""} alt="" className="h-full w-full object-cover" />
          </div>
        ) : representativeImage?.imageUrl ? (
          <div className="h-[300px] overflow-hidden rounded-3xl border border-[var(--app-border)] bg-white/[0.04]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={representativeImage.imageUrl} alt="" className="h-full w-full object-cover" />
            <div className="border-t border-[var(--app-border)] bg-[var(--app-card-soft)] p-3 text-[13px] leading-relaxed text-[var(--app-muted)]">
              Imagen ilustrativa.{" "}
              {representativeImage.pageUrl ? (
                <a className="font-bold text-[var(--app-primary)] underline" href={representativeImage.pageUrl} target="_blank" rel="noreferrer">
                  {representativeImage.source ?? "Fuente"}
                </a>
              ) : (
                <span className="font-bold text-[var(--app-muted)]">{representativeImage.source ?? "Wikipedia/Wikimedia"}</span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex min-h-[220px] w-full items-center justify-center rounded-3xl border border-[var(--app-border)] bg-white/[0.04] text-white/70">
            {isLoadingRepresentative ? (
              <p className="text-[15px] font-semibold text-white/70">Buscando imagen…</p>
            ) : (
              <svg aria-hidden="true" className="h-20 w-20" viewBox="0 0 24 24" fill="none">
                <path d="M9 3.8h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                <path
                  d="M8 7.2c0-1.2 1-2.2 2.2-2.2h3.6c1.2 0 2.2 1 2.2 2.2v12c0 1.3-1 2.3-2.3 2.3h-3.4c-1.3 0-2.3-1-2.3-2.3v-12Z"
                  stroke="currentColor"
                  strokeWidth="1.65"
                  strokeLinejoin="round"
                />
                <path d="M9.4 11.2h5.2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                <path d="M12 8.6v5.2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            )}
          </div>
        )}

        {valor ? (
          <p className="break-words text-base font-semibold text-[var(--app-muted)]">
            {valor}
          </p>
        ) : null}

        {explicacion ? (
          <p className="break-words text-base leading-relaxed text-[var(--app-text)]">{explicacion}</p>
        ) : null}
      </section>
    </main>
  );
}

