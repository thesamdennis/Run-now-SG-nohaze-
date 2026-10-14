"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

type Props = {
  start: { lat: number; lng: number; name: string };
  path: number[][]; // [lng, lat] pairs (GeoJSON order)
};

// OneMap (Singapore Land Authority) basemap. Attribution must stay visible.
const ONEMAP_TILES = "https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png";
const ONEMAP_ATTRIBUTION =
  '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:20px;width:20px;display:inline"/>&nbsp;' +
  '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a>&nbsp;&copy;&nbsp;contributors&nbsp;&#124;&nbsp;' +
  '<a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority</a>';

export default function RouteMap({ start, path }: Props) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;

    // Leaflet touches `window`, so load it only in the browser.
    import("leaflet").then((L) => {
      if (cancelled || !el.current) return;
      map = L.map(el.current, {
        minZoom: 11,
        maxZoom: 19,
        maxBounds: [
          [1.144, 103.535],
          [1.494, 104.502],
        ],
      });
      L.tileLayer(ONEMAP_TILES, { minZoom: 11, maxZoom: 19, detectRetina: true, attribution: ONEMAP_ATTRIBUTION }).addTo(map);

      L.circleMarker([start.lat, start.lng], { radius: 9, color: "#fff", weight: 3, fillColor: "#16a34a", fillOpacity: 1 })
        .addTo(map)
        .bindTooltip(`Start / finish: ${start.name}`);

      if (path.length > 1) {
        const line = L.polyline(
          path.map(([lng, lat]) => [lat, lng] as [number, number]),
          { color: "#16a34a", weight: 5 },
        ).addTo(map);
        map.fitBounds(line.getBounds(), { padding: [24, 24] });
      } else {
        map.setView([start.lat, start.lng], 15);
      }
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [start, path]);

  return <div ref={el} className="h-72 w-full overflow-hidden rounded-2xl ring-1 ring-slate-200" />;
}
