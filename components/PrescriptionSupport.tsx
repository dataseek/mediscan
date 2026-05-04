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

type LookupStatus = "idle" | "loading" | "ready" | "error" | "denied" | "location-off";
type PharmacySource = "google" | "osm" | null;

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

function MapPinIcon({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none">
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

function PharmacyIcon() {
  return (
    <svg aria-hidden="true" className="h-[26px] w-[26px]" viewBox="0 0 24 24" fill="none">
      <path
        d="M6.5 10.2V7.4a2.4 2.4 0 0 1 2.4-2.4h6.2a2.4 2.4 0 0 1 2.4 2.4v2.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M6.2 10.2h11.6a1.7 1.7 0 0 1 1.7 1.7v6.4a2.7 2.7 0 0 1-2.7 2.7H7.2a2.7 2.7 0 0 1-2.7-2.7v-6.4a1.7 1.7 0 0 1 1.7-1.7Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M12 12.8v4.2M9.9 14.9h4.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function getHoursSummary(pharmacy: Pharmacy, translate: (path: string) => string) {
  if (pharmacy.is24h) {
    return {
      label: translate("prescriptionSupport.open24h"),
      details: pharmacy.openingHours ?? translate("prescriptionSupport.open24hDetails"),
      className: "bg-red-500/15 text-red-100 ring-1 ring-red-300/20"
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

function normalizeHoursDetails(details: string) {
  return details.trim().replace(/\s*-\s*$/, "");
}

export function PrescriptionSupport({ medications }: { medications: MedicalValue[] }) {
  const { locale, t } = useLanguage();
  const [status, setStatus] = useState<LookupStatus>("idle");
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [source, setSource] = useState<PharmacySource>(null);

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
      setStatus("location-off");
      return;
    }

    setStatus("loading");

    try {
      const position = await getPosition();
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const response = await fetch(
        `/api/pharmacies?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&lang=${encodeURIComponent(locale)}`
      );
      const data = (await response.json()) as { pharmacies?: Pharmacy[]; source?: PharmacySource; error?: string };

      if (!response.ok || !Array.isArray(data.pharmacies)) {
        throw new Error(data.error ?? "Lookup failed");
      }

      setPharmacies(data.pharmacies);
      setSource(data.source ?? null);
      setStatus("ready");
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? (error as { code?: number }).code : null;
      if (code === 1) {
        setStatus("denied");
        return;
      }

      if (code === 2 || code === 3) {
        setStatus("location-off");
        return;
      }

      setStatus("error");
    }
  }, [locale]);

  useEffect(() => {
    if (status === "idle") {
      void handleLookup();
    }
  }, [handleLookup, status]);

  return (
    <article className="min-w-0 max-w-full overflow-hidden rounded-[1.35rem] border border-[var(--app-border-strong)] bg-[var(--app-card)] shadow-[var(--app-shadow)] animate-fadeIn [will-change:transform,opacity]">
      <header className="flex min-w-0 items-center justify-between gap-3 border-b border-[var(--app-border)] bg-[linear-gradient(180deg,rgba(61,212,165,0.16),rgba(61,212,165,0.06))] p-4 sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 shadow-sm">
            <PharmacyIcon />
          </div>
          <div className="min-w-0">
            <h3 className="break-words text-[17px] font-extrabold leading-tight text-[var(--app-text-strong)] sm:text-xl">
              {t("prescriptionSupport.title")}
            </h3>
            <p className="mt-1 text-[13px] font-semibold text-[var(--app-muted)]">
              {source ? `Fuente: ${source === "google" ? "Google Maps" : "OpenStreetMap"}` : t("prescriptionSupport.loading")}
            </p>
          </div>
        </div>
        <div className="shrink-0 rounded-full border border-white/[0.10] bg-white/[0.06] px-3 py-1.5 text-[12px] font-extrabold text-white/85">
          <span className="inline-flex items-center gap-1">
            <MapPinIcon className="h-[18px] w-[18px]" />
            <span>5 km</span>
          </span>
        </div>
      </header>

      <div className="min-w-0 space-y-3 p-4 sm:p-5">
        {readableMedications.length === 0 ? (
          <div className="rounded-xl border border-amber-300/20 bg-amber-400/10 p-3 text-[13px] leading-relaxed text-amber-100">
            {t("result.noPrescriptionValues")}
          </div>
        ) : null}

        {status === "idle" || status === "loading" ? (
          <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3 text-[15px] text-[var(--app-muted)]">
            {t("prescriptionSupport.loading")}
          </div>
        ) : null}

        {status === "denied" || status === "location-off" ? (
          <div className="rounded-xl border border-amber-300/20 bg-amber-400/10 p-3 text-[14px] font-semibold leading-relaxed text-amber-100">
            {status === "denied" ? t("prescriptionSupport.permissionDenied") : t("prescriptionSupport.locationDisabled")}
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
                {pharmacies.slice(0, 3).map((pharmacy, index) => {
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
                      {!pharmacy.is24h ? (
                        <p className="text-[12px] leading-relaxed text-[var(--app-muted)]">
                          <span className="font-bold text-[var(--app-text-strong)]">{t("prescriptionSupport.hoursLabel")} </span>
                          {normalizeHoursDetails(hours.details)}
                        </p>
                      ) : null}
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
