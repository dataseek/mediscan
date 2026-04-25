"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { PharmacyMap } from "@/components/PharmacyMap";
import type { MedicalValue } from "@/lib/types";

interface Pharmacy {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distanceKm: number;
  openingHours: string | null;
}

interface LocationState {
  lat: number;
  lon: number;
  countryCode: string;
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

function distanceKm(fromLat: number, fromLon: number, toLat: number, toLon: number) {
  const radiusKm = 6371;
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLon = ((toLon - fromLon) * Math.PI) / 180;
  const lat1 = (fromLat * Math.PI) / 180;
  const lat2 = (toLat * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

async function getCountryCode(lat: number, lon: number) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=3&addressdetails=1`
    );
    const data = (await response.json()) as { address?: { country_code?: string } };

    return data.address?.country_code?.toLowerCase() ?? "us";
  } catch {
    return "us";
  }
}

async function getNearbyPharmacies(lat: number, lon: number): Promise<Pharmacy[]> {
  const query = `
    [out:json][timeout:15];
    (
      node["amenity"="pharmacy"](around:5000,${lat},${lon});
      way["amenity"="pharmacy"](around:5000,${lat},${lon});
      relation["amenity"="pharmacy"](around:5000,${lat},${lon});
    );
    out center tags 12;
  `;

  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ data: query })
  });
  const data = (await response.json()) as {
    elements?: Array<{
      id: number;
      lat?: number;
      lon?: number;
      center?: { lat?: number; lon?: number };
      tags?: { name?: string; opening_hours?: string };
      type?: string;
    }>;
  };

  return (data.elements ?? [])
    .map((item) => {
      const pharmacyLat = item.lat ?? item.center?.lat;
      const pharmacyLon = item.lon ?? item.center?.lon;

      if (typeof pharmacyLat !== "number" || typeof pharmacyLon !== "number") {
        return null;
      }

      return {
        id: `${item.type ?? "osm"}-${item.id}`,
        name: item.tags?.name?.trim() || "Pharmacy",
        lat: pharmacyLat,
        lon: pharmacyLon,
        distanceKm: distanceKm(lat, lon, pharmacyLat, pharmacyLon),
        openingHours: item.tags?.opening_hours?.trim() || null
      };
    })
    .filter((item): item is Pharmacy => item !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 5);
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

function isOpen24Hours(openingHours: string | null) {
  if (!openingHours) {
    return false;
  }

  const normalized = openingHours.toLowerCase().replace(/\s+/g, "");
  return normalized.includes("24/7") || normalized.includes("00:00-24:00") || normalized.includes("00:00-00:00");
}

function getHoursSummary(openingHours: string | null, translate: (path: string) => string) {
  if (!openingHours) {
    return {
      label: translate("prescriptionSupport.hoursUnavailable"),
      details: translate("prescriptionSupport.hoursUnavailableDetails"),
      className: "bg-white/[0.06] text-[#c4ccd8]"
    };
  }

  if (isOpen24Hours(openingHours)) {
    return {
      label: translate("prescriptionSupport.open24h"),
      details: openingHours,
      className: "bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-300/20"
    };
  }

  return {
    label: translate("prescriptionSupport.not24h"),
    details: openingHours,
    className: "bg-amber-400/15 text-amber-100 ring-1 ring-amber-300/20"
  };
}

export function PrescriptionSupport({ medications }: { medications: MedicalValue[] }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<LookupStatus>("idle");
  const [location, setLocation] = useState<LocationState | null>(null);
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
      const countryCode = await getCountryCode(lat, lon);
      const nearby = await getNearbyPharmacies(lat, lon);

      setLocation({ lat, lon, countryCode });
      setPharmacies(nearby);
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
    <article className="grid min-w-0 max-w-full grid-cols-[44px_minmax(0,1fr)_20px] items-start gap-x-2.5 gap-y-3 rounded-2xl border border-[rgba(13,61,50,1)] bg-panel p-3 animate-fadeIn [will-change:transform,opacity] min-[380px]:grid-cols-[48px_minmax(0,1fr)_20px] min-[380px]:gap-x-3 min-[380px]:p-3.5 sm:grid-cols-[52px_minmax(0,1fr)_22px] sm:gap-x-3.5 sm:p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#173a32] text-[#3dd4a5] min-[380px]:h-12 min-[380px]:w-12 sm:h-[52px] sm:w-[52px]">
        <MapPinIcon />
      </div>
      <div className="min-w-0 self-center pt-0.5">
        <h3 className="break-words text-[14px] font-semibold leading-tight text-white min-[380px]:text-[15px] sm:text-base">
          {t("prescriptionSupport.title")}
        </h3>
      </div>
      <div />
      <div className="col-span-3 mt-2 min-w-0 space-y-3 min-[380px]:mt-2.5 sm:mt-3">
        {status === "idle" || status === "loading" ? (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-3 text-[13px] text-[#b4bcc9]">
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
            {location ? (
              <div className="relative h-52 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a121c]">
                <PharmacyMap location={location} pharmacies={pharmacies} userLabel={t("prescriptionSupport.yourLocation")} />
                <div className="absolute bottom-2 left-2 z-30 rounded-lg border border-black/10 bg-[#07111b]/90 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg">
                  {t("prescriptionSupport.mapLegend")}
                </div>
              </div>
            ) : null}

            {pharmacies.length > 0 ? (
              <ul className="space-y-2">
                {pharmacies.map((pharmacy, index) => {
                  const hours = getHoursSummary(pharmacy.openingHours, t);

                  return (
                  <li key={pharmacy.id} className="rounded-xl border border-white/[0.06] bg-white/[0.035] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 break-words text-[13px] font-semibold text-white">
                        <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-medical text-[11px] font-bold text-white">
                          {index + 1}
                        </span>
                        {pharmacy.name}
                      </p>
                      <span className="shrink-0 text-[12px] text-[#9aa3b2]">{pharmacy.distanceKm.toFixed(1)} km</span>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${hours.className}`}>
                        {hours.label}
                      </span>
                      <p className="text-[12px] leading-relaxed text-[#b4bcc9]">
                        <span className="font-semibold text-white/90">{t("prescriptionSupport.hoursLabel")} </span>
                        {hours.details}
                      </p>
                    </div>
                    <a
                      className="mt-2 inline-flex text-[12px] font-semibold text-[#3dd4a5] hover:text-[#64e4bb]"
                      href={`https://www.google.com/maps/search/?api=1&query=${pharmacy.lat},${pharmacy.lon}`}
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
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-3 text-[13px] text-[#b4bcc9]">
                {t("prescriptionSupport.noPharmacies")}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}
