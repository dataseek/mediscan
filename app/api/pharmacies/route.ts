import { NextResponse } from "next/server";

export const runtime = "edge";

type Locale = "es" | "en" | "pt";

interface PharmacyResult {
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

function isOpen24Hours(openingHours: string | null, periods?: Array<{ open?: { day?: number; time?: string }; close?: { day?: number; time?: string } }>) {
  if (periods?.some((period) => period.open?.day === 0 && period.open?.time === "0000" && !period.close)) {
    return true;
  }

  if (!openingHours) {
    return false;
  }

  const normalized = openingHours.toLowerCase().replace(/\s+/g, "");
  return (
    normalized.includes("24/7") ||
    normalized.includes("open24hours") ||
    normalized.includes("abiertolas24horas") ||
    normalized.includes("aberta24h") ||
    normalized.includes("00:00-24:00") ||
    normalized.includes("00:00-00:00")
  );
}

function googleLanguage(locale: Locale) {
  if (locale === "pt") return "pt-BR";
  if (locale === "en") return "en";
  return "es-419";
}

function localizeOsmOpeningHours(openingHours: string | null, locale: Locale) {
  if (!openingHours) return openingHours;

  const replacements: Record<string, Record<string, string>> = {
    es: { Mo: "Lu", Tu: "Ma", We: "Mi", Th: "Ju", Fr: "Vi", Sa: "Sá", Su: "Do" },
    en: { Mo: "Mon", Tu: "Tue", We: "Wed", Th: "Thu", Fr: "Fri", Sa: "Sat", Su: "Sun" },
    pt: { Mo: "Seg", Tu: "Ter", We: "Qua", Th: "Qui", Fr: "Sex", Sa: "Sáb", Su: "Dom" }
  };

  const map = replacements[locale] ?? replacements.es;
  return Object.entries(map).reduce((current, [from, to]) => current.replace(new RegExp(`\\b${from}\\b`, "g"), to), openingHours);
}

async function getGooglePharmacies(lat: number, lon: number, apiKey: string, locale: Locale): Promise<PharmacyResult[]> {
  const nearbyUrl = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  nearbyUrl.searchParams.set("location", `${lat},${lon}`);
  nearbyUrl.searchParams.set("radius", "5000");
  nearbyUrl.searchParams.set("type", "pharmacy");
  nearbyUrl.searchParams.set("key", apiKey);
  nearbyUrl.searchParams.set("language", googleLanguage(locale));

  const nearbyResponse = await fetch(nearbyUrl);
  const nearbyData = (await nearbyResponse.json()) as {
    status?: string;
    results?: Array<{
      place_id?: string;
      name?: string;
      vicinity?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
    }>;
  };

  if (!nearbyResponse.ok || nearbyData.status !== "OK" || !nearbyData.results?.length) {
    return [];
  }

  const details: Array<PharmacyResult | null> = await Promise.all(
    nearbyData.results.slice(0, 3).map(async (place) => {
      if (!place.place_id) {
        return null;
      }

      const detailsUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
      detailsUrl.searchParams.set("place_id", place.place_id);
      detailsUrl.searchParams.set("fields", "name,formatted_address,geometry,opening_hours,url,place_id");
      detailsUrl.searchParams.set("key", apiKey);
      detailsUrl.searchParams.set("language", googleLanguage(locale));

      const detailsResponse = await fetch(detailsUrl);
      const detailsData = (await detailsResponse.json()) as {
        status?: string;
        result?: {
          place_id?: string;
          name?: string;
          formatted_address?: string;
          url?: string;
          geometry?: { location?: { lat?: number; lng?: number } };
          opening_hours?: {
            open_now?: boolean;
            weekday_text?: string[];
            periods?: Array<{ open?: { day?: number; time?: string }; close?: { day?: number; time?: string } }>;
          };
        };
      };

      const result = detailsData.result;
      const pharmacyLat = result?.geometry?.location?.lat ?? place.geometry?.location?.lat;
      const pharmacyLon = result?.geometry?.location?.lng ?? place.geometry?.location?.lng;

      if (!detailsResponse.ok || detailsData.status !== "OK" || !result || typeof pharmacyLat !== "number" || typeof pharmacyLon !== "number") {
        return null;
      }

      const openingHours = result.opening_hours?.weekday_text?.join(" | ") ?? null;

      return {
        id: result.place_id ?? place.place_id,
        name: result.name ?? place.name ?? "Farmacia",
        lat: pharmacyLat,
        lon: pharmacyLon,
        distanceKm: distanceKm(lat, lon, pharmacyLat, pharmacyLon),
        address: result.formatted_address ?? place.vicinity ?? null,
        openingHours,
        openNow: typeof result.opening_hours?.open_now === "boolean" ? result.opening_hours.open_now : null,
        is24h: isOpen24Hours(openingHours, result.opening_hours?.periods),
        mapsUrl: result.url ?? `https://www.google.com/maps/search/?api=1&query=${pharmacyLat},${pharmacyLon}`,
        source: "google" as const
      };
    })
  );

  return details.filter((item): item is PharmacyResult => item !== null).sort((a, b) => a.distanceKm - b.distanceKm);
}

async function getOsmPharmacies(lat: number, lon: number, locale: Locale): Promise<PharmacyResult[]> {
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
      tags?: { name?: string; opening_hours?: string; "addr:street"?: string; "addr:housenumber"?: string };
      type?: string;
    }>;
  };

  const pharmacies: Array<PharmacyResult | null> = (data.elements ?? [])
    .map((item) => {
      const pharmacyLat = item.lat ?? item.center?.lat;
      const pharmacyLon = item.lon ?? item.center?.lon;

      if (typeof pharmacyLat !== "number" || typeof pharmacyLon !== "number") {
        return null;
      }

      const address = [item.tags?.["addr:street"], item.tags?.["addr:housenumber"]].filter(Boolean).join(" ") || null;
      const openingHours = localizeOsmOpeningHours(item.tags?.opening_hours?.trim() || null, locale);

      return {
        id: `${item.type ?? "osm"}-${item.id}`,
        name: item.tags?.name?.trim() || "Farmacia",
        lat: pharmacyLat,
        lon: pharmacyLon,
        distanceKm: distanceKm(lat, lon, pharmacyLat, pharmacyLon),
        address,
        openingHours,
        openNow: null,
        is24h: isOpen24Hours(openingHours),
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${pharmacyLat},${pharmacyLon}`,
        source: "osm" as const
      };
    });

  return pharmacies
    .filter((item): item is PharmacyResult => item !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 3);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  const langParam = url.searchParams.get("lang");
  const locale: Locale = langParam === "en" || langParam === "pt" || langParam === "es" ? langParam : "es";

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "Invalid location" }, { status: 400 });
  }

  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;

  try {
    const pharmacies = googleApiKey ? await getGooglePharmacies(lat, lon, googleApiKey, locale) : [];

    if (pharmacies.length > 0) {
      return NextResponse.json({ pharmacies, source: "google" });
    }

    return NextResponse.json({ pharmacies: await getOsmPharmacies(lat, lon, locale), source: "osm" });
  } catch {
    try {
      return NextResponse.json({ pharmacies: await getOsmPharmacies(lat, lon, locale), source: "osm" });
    } catch {
      return NextResponse.json({ error: "Lookup failed" }, { status: 502 });
    }
  }
}
