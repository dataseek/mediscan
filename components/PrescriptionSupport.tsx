"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import type { MedicalValue } from "@/lib/types";

interface Pharmacy {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distanceKm: number;
  address: string | null;
  openingHours: string | null;
  openNow: boolean | null;
  is24h: boolean;
  mapsUrl: string;
  source: "google" | "osm";
}

type LookupStatus = "idle" | "loading" | "ready" | "error" | "denied";

function normalizeMedicationName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      maximumAge: 1000 * 60 * 5,
      timeout: 12000
    });
  });
}

function MapPinIcon() {
  return (
    <svg aria-hidden="true" className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21s6-5.2 6-11a6 6 0 0 0-12 0c0 5.8 6 11 6 11Z"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      <path d="M12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z" stroke="currentColor" strokeWidth="1.65" />
    </svg>
  );
}

function getHoursSummary(pharmacy: Pharmacy, translate: (path: string) => string) {
  if (pharmacy.is24h) {
    return {
      label: translate("prescriptionSupport.open24h"),
      details: pharmacy.openingHours ?? translate("prescriptionSupport.open24hDetails"),
      className: "bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-300/20"
    };
  }

  if (pharmacy.openNow === true) {
    return {
      label: translate("prescriptionSupport.openNow"),
      details: pharmacy.openingHours ?? translate("prescriptionSupport.hoursUnavailableDetails"),
      className: "bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-300/20"
    };
  }

  if (pharmacy.openNow === false) {
    return {
      label: translate("prescriptionSupport.closedNow"),
      details: pharmacy.openingHours ?? translate("prescriptionSupport.hoursUnavailableDetails"),
      className: "bg-red-500/15 text-red-100 ring-1 ring-red-300/20"
    };
  }

  if (!pharmacy.openingHours) {
    return {
      label: translate("prescriptionSupport.hoursUnavailable"),
      details: translate("prescriptionSupport.hoursUnavailableDetails"),
      className: "bg-white/[0.06] text-[#c4ccd8]"
    };
  }

  return {
    label: translate("prescriptionSupport.not24h"),
    details: pharmacy.openingHours,
    className: "bg-amber-400/15 text-amber-100 ring-1 ring-amber-300/20"
  };
}

export function PrescriptionSupport({ medications }: { medications: MedicalValue[] }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<LookupStatus>("idle");
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);

  const readableMedications = useMemo(() => {
    return medications
      .filter((item) => {
        const name = normalizeMedicationName(item.nombre);
        return name && !name.includes("ilegible") && !name.includes("unreadable") && !name.includes("nao da");
      })
      .slice(0, 5);
  }, [medications]);

  const handleLookup = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      return;
    }

    setStatus("loading");

    try {
      const position = await getPosition();
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const response = await fetch(`/api/pharmacies?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`);
      const data = (await response.json()) as { pharmacies?: Pharmacy[]; error?: string };

      if (!response.ok || !Array.isArray(data.pharmacies)) {
        throw new Error(data.error ?? "Lookup failed");
      }

      setPharmacies(data.pharmacies);
      setStatus("ready");
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? (error as { code?: number }).code : null;
      setStatus(code === 1 ? "denied" : "error");
    }
  }, []);

  useEffect(() => {
    if (status === "idle") {
      void handleLookup();
    }
  }, [handleLookup, status]);

  if (readableMedications.length === 0) {
    return null;
  }

  return (
    <article className="grid min-w-0 max-w-full grid-cols-[52px_minmax(0,1fr)_20px] items-start gap-x-3 gap-y-3 rounded-[1.35rem] border border-[var(--app-border-strong)] bg-[var(--app-card)] p-4 shadow-[var(--app-shadow)] animate-fadeIn [will-change:transform,opacity] min-[380px]:grid-cols-[56px_minmax(0,1fr)_20px] min-[380px]:gap-x-3.5 sm:grid-cols-[60px_minmax(0,1fr)_22px] sm:gap-x-4 sm:p-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 min-[380px]:h-14 min-[380px]:w-14 sm:h-[58px] sm:w-[58px]">
        <MapPinIcon />
      </div>
      <div className="min-w-0 self-center pt-0.5">
        <h3 className="break-words text-[17px] font-bold leading-tight text-[var(--app-text-strong)] min-[380px]:text-lg sm:text-xl">
          {t("prescriptionSupport.title")}
        </h3>
      </div>
      <div />
      <div className="col-span-3 mt-2 min-w-0 space-y-3 min-[380px]:mt-2.5 sm:mt-3">
        {status === "idle" || status === "loading" ? (
          <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3 text-[15px] text-[var(--app-muted)]">
            {t("prescriptionSupport.loading")}
          </div>
        ) : null}

        {status === "denied" ? (
          <div className="rounded-xl border border-amber-300/20 bg-amber-400/10 p-3 text-[13px] leading-relaxed text-amber-100">
            {t("prescriptionSupport.permissionDenied")}
          </div>
        ) : null}

        {status === "error" ? (
          <div className="rounded-xl border border-red-300/20 bg-red-500/10 p-3 text-[13px] leading-relaxed text-red-100">
            {t("prescriptionSupport.lookupError")}
          </div>
        ) : null}

        {status === "ready" ? (
          <div className="space-y-3">
            {pharmacies.length > 0 ? (
              <ul className="space-y-2">
                {pharmacies.map((pharmacy, index) => {
                  const hours = getHoursSummary(pharmacy, t);

                  return (
                  <li key={pharmacy.id} className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 break-words text-[16px] font-bold text-[var(--app-text-strong)]">
                        <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-medical text-[11px] font-bold text-white">
                          {index + 1}
                        </span>
                        {pharmacy.name}
                      </p>
                      <span className="shrink-0 text-[13px] font-semibold text-[var(--app-muted)]">{pharmacy.distanceKm.toFixed(1)} km</span>
                    </div>
                    {pharmacy.address ? (
                      <p className="mt-1.5 break-words text-[14px] leading-relaxed text-[var(--app-muted)]">{pharmacy.address}</p>
                    ) : null}
                    <div className="mt-2 space-y-1.5">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${hours.className}`}>
                        {hours.label}
                      </span>
                      <p className="text-[14px] leading-relaxed text-[var(--app-muted)]">
                        <span className="font-bold text-[var(--app-text-strong)]">{t("prescriptionSupport.hoursLabel")} </span>
                        {hours.details}
                      </p>
                    </div>
                    <a
                      className="mt-3 inline-flex min-h-[44px] items-center rounded-2xl bg-[var(--app-primary)] px-4 text-[14px] font-bold text-white hover:bg-[var(--app-primary-hover)]"
                      href={pharmacy.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("prescriptionSupport.openMaps")}
                    </a>
                  </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3 text-[15px] text-[var(--app-muted)]">
                {t("prescriptionSupport.noPharmacies")}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}
