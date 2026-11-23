"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, CircleMarker } from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./maps.module.css";
import { mapText, type MapLocale, type PublicMapIssue } from "./text";
export default function MapCanvas({
  issues,
  selected,
  onPick,
  locale,
}: {
  issues?: PublicMapIssue[];
  selected?: [number, number] | null;
  onPick?: (latitude: number, longitude: number) => void;
  locale: MapLocale;
}) {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<LeafletMap | null>(null),
    marker = useRef<CircleMarker | null>(null);
  const [error, setError] = useState(false);
  const initial = useRef(selected);
  const pick = useRef(onPick);
  useEffect(() => {
    pick.current = onPick;
  }, [onPick]);
  useEffect(() => {
    let disposed = false;
    import("leaflet")
      .then((L) => {
        if (disposed || !container.current) return;
        const reduce = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        const instance = L.map(container.current, {
          scrollWheelZoom: false,
          zoomAnimation: !reduce,
          fadeAnimation: !reduce,
          markerZoomAnimation: !reduce,
        }).setView(
          initial.current ?? [12.88, 121.77],
          initial.current ? 13 : 6,
        );
        map.current = instance;
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        })
          .on("tileerror", () => {
            if (!disposed) setError(true);
          })
          .addTo(instance);
        if (initial.current)
          marker.current = L.circleMarker(initial.current, {
            radius: 9,
            color: "#123f29",
            fillColor: "#217847",
            fillOpacity: 0.9,
          }).addTo(instance);
        if (issues?.length) {
          const points: [number, number][] = [];
          for (const issue of issues) {
            const point: [number, number] = [
              Number(issue.latitude),
              Number(issue.longitude),
            ];
            points.push(point);
            const popup = document.createElement("div"),
              title = document.createElement("p"),
              link = document.createElement("a");
            title.textContent = issue.public_title;
            link.textContent = mapText[locale].open;
            link.href = `/community/${issue.report_id}`;
            popup.append(title, link);
            L.circleMarker(point, {
              radius: 9,
              color: "#123f29",
              fillColor: "#217847",
              fillOpacity: 0.8,
            })
              .bindPopup(popup)
              .addTo(instance);
          }
          instance.fitBounds(points, {
            padding: [24, 24],
            maxZoom: 12,
            animate: false,
          });
        }
        instance.on("click", (event) =>
          pick.current?.(event.latlng.lat, event.latlng.lng),
        );
      })
      .catch(() => {
        if (!disposed) setError(true);
      });
    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
  }, [issues, locale]);
  useEffect(() => {
    if (!map.current) return;
    if (!selected) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    import("leaflet").then((L) => {
      if (!map.current) return;
      if (marker.current) marker.current.setLatLng(selected);
      else
        marker.current = L.circleMarker(selected, {
          radius: 9,
          color: "#123f29",
          fillColor: "#217847",
          fillOpacity: 0.9,
        }).addTo(map.current);
    });
  }, [selected]);
  return (
    <div className={styles.frame}>
      {error && <p role="alert">{mapText[locale].failure}</p>}
      <div
        ref={container}
        className={styles.map}
        role="region"
        aria-label={mapText[locale].title}
      />
    </div>
  );
}
