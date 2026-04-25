"use client";

import { useEffect, useRef } from "react";
import type { DivIcon, Map as LeafletMap, Marker } from "leaflet";

interface PharmacyMapPharmacy {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export function PharmacyMap({
  location,
  pharmacies,
  userLabel
}: {
  location: { lat: number; lon: number };
  pharmacies: PharmacyMapPharmacy[];
  userLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRefs = useRef<Marker[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function setupMap() {
      const leaflet = await import("leaflet");

      if (cancelled || !containerRef.current) {
        return;
      }

      if (!mapRef.current) {
        mapRef.current = leaflet.map(containerRef.current, {
          attributionControl: false,
          zoomControl: true,
          scrollWheelZoom: true
        });

        leaflet
          .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap"
          })
          .addTo(mapRef.current);
      }

      const map = mapRef.current;
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];

      const userIcon: DivIcon = leaflet.divIcon({
        className: "",
        html: `<div class="mediscan-map-pin mediscan-map-pin-user">U</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30]
      });

      markerRefs.current.push(
        leaflet
          .marker([location.lat, location.lon], { icon: userIcon, title: userLabel })
          .addTo(map)
      );

      pharmacies.forEach((pharmacy, index) => {
        const pharmacyIcon = leaflet.divIcon({
          className: "",
          html: `<div class="mediscan-map-pin mediscan-map-pin-pharmacy">${index + 1}</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 34]
        });

        markerRefs.current.push(
          leaflet
            .marker([pharmacy.lat, pharmacy.lon], {
              icon: pharmacyIcon,
              title: `${index + 1}. ${pharmacy.name}`
            })
            .addTo(map)
        );
      });

      const boundsPoints: Array<[number, number]> = [
        [location.lat, location.lon],
        ...pharmacies.map((pharmacy): [number, number] => [pharmacy.lat, pharmacy.lon])
      ];

      if (boundsPoints.length > 1) {
        map.fitBounds(boundsPoints, { padding: [28, 28], maxZoom: 15 });
      } else {
        map.setView([location.lat, location.lon], 14);
      }
    }

    void setupMap();

    return () => {
      cancelled = true;
    };
  }, [location.lat, location.lon, pharmacies, userLabel]);

  useEffect(() => {
    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="h-52 w-full rounded-xl bg-[#0a121c]" />;
}
