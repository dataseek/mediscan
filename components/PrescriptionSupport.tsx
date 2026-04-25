"use client";

import { useCallback, useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import type { MedicalValue } from "@/lib/types";

interface Pharmacy {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distanceKm: number;
}

interface LocationState {
  lat: number;
  lon: number;
  countryCode: string;
}

type LookupStatus = "idle" | "loading" | "ready" | "error" | "denied";

const commonMedicationPrices = [
  {
    keys: ["amoxicillin", "amoxicilina"],
    usd: "$5 - $18",
    brl: "R$ 18 - R$ 55",
    eur: "€3 - €9"
  },
  {
    keys: ["ibuprofen", "ibuprofeno"],
    usd: "$4 - $12",
    brl: "R$ 10 - R$ 35",
    eur: "€2 - €8"
  },
  {
    keys: ["paracetamol", "acetaminophen", "acetaminofeno"],
    usd: "$4 - $15",
    brl: "R$ 8 - R$ 30",
    eur: "€2 - €7"
  },
  {
    keys: ["azithromycin", "azitromicina"],
    usd: "$8 - $30",
    brl: "R$ 25 - R$ 85",
    eur: "€6 - €18"
  },
  {
    keys: ["omeprazole", "omeprazol"],
    usd: "$6 - $22",
    brl: "R$ 12 - R$ 45",
    eur: "€3 - €12"
  },
  {
    keys: ["metformin", "metformina"],
    usd: "$4 - $15",
    brl: "R$ 10 - R$ 35",
    eur: "€3 - €10"
  },
  {
    keys: ["losartan", "losartana"],
    usd: "$6 - $20",
    brl: "R$ 12 - R$ 45",
    eur: "€4 - €12"
  },
  {
    keys: ["atorvastatin", "atorvastatina"],
    usd: "$8 - $28",
    brl: "R$ 18 - R$ 60",
    eur: "€5 - €16"
  }
];

function normalizeMedicationName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getCurrencyBucket(countryCode: string) {
  if (countryCode === "br") {
    return "brl";
  }

  if (["es", "pt", "fr", "de", "it", "nl", "ie", "be", "at"].includes(countryCode)) {
    return "eur";
  }

  return "usd";
}

function getEstimatedPrice(name: string, countryCode: string) {
  const normalizedName = normalizeMedicationName(name);
  const match = commonMedicationPrices.find((entry) =>
    entry.keys.some((key) => normalizedName.includes(normalizeMedicationName(key)))
  );

  if (!match) {
    return null;
  }

  return match[getCurrencyBucket(countryCode)];
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
      tags?: { name?: string };
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
        distanceKm: distanceKm(lat, lon, pharmacyLat, pharmacyLon)
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

  const mapSrc = useMemo(() => {
    if (!location) {
      return null;
    }

    const delta = 0.025;
    const bbox = [
      location.lon - delta,
      location.lat - delta,
      location.lon + delta,
      location.lat + delta
    ].join(",");

    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${location.lat},${location.lon}`;
  }, [location]);

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
        <div className="rounded-xl border border-white/[0.06] bg-[#0a121c]/85 p-3">
          <p className="text-[12px] leading-relaxed text-[#b4bcc9] sm:text-[13px]">{t("prescriptionSupport.priceDisclaimer")}</p>
          <ul className="mt-3 divide-y divide-white/[0.06]">
            {readableMedications.map((medication, index) => {
              const price = location ? getEstimatedPrice(medication.nombre, location.countryCode) : null;

              return (
                <li key={`${medication.nombre}-${index}`} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <span className="min-w-0 break-words text-[13px] font-medium text-[#dce3ec]">{medication.nombre}</span>
                  <span className="shrink-0 text-right text-[12px] font-semibold text-white">
                    {price ?? (location ? t("prescriptionSupport.priceUnavailable") : t("prescriptionSupport.locationNeeded"))}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {status === "idle" ? (
          <button
            type="button"
            className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-medical px-3 text-[13px] font-semibold text-white transition hover:bg-medicalHover focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            onClick={handleLookup}
          >
            {t("prescriptionSupport.findNearby")}
          </button>
        ) : null}

        {status === "loading" ? (
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
            {mapSrc ? (
              <iframe
                title={t("prescriptionSupport.mapTitle")}
                src={mapSrc}
                className="h-44 w-full rounded-xl border border-white/[0.08] bg-[#0a121c]"
                loading="lazy"
              />
            ) : null}

            {pharmacies.length > 0 ? (
              <ul className="space-y-2">
                {pharmacies.map((pharmacy) => (
                  <li key={pharmacy.id} className="rounded-xl border border-white/[0.06] bg-white/[0.035] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 break-words text-[13px] font-semibold text-white">{pharmacy.name}</p>
                      <span className="shrink-0 text-[12px] text-[#9aa3b2]">{pharmacy.distanceKm.toFixed(1)} km</span>
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
                ))}
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
