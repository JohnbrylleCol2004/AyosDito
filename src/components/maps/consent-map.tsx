"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { mapText, type MapLocale, type PublicMapIssue } from "./text";
const MapCanvas = dynamic(() => import("./map-canvas"), { ssr: false });
export function ConsentMap({
  issues,
  selected,
  onPick,
  locale,
  privateLocation = false,
}: {
  issues?: PublicMapIssue[];
  selected?: [number, number] | null;
  onPick?: (latitude: number, longitude: number) => void;
  locale: MapLocale;
  privateLocation?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const t = mapText[locale];
  return (
    <div>
      <p>{privateLocation ? t.privateExternal : t.external}</p>
      {loaded ? (
        <MapCanvas
          issues={issues}
          selected={selected}
          onPick={onPick}
          locale={locale}
        />
      ) : (
        <button
          className="button"
          type="button"
          onClick={() => setLoaded(true)}
        >
          {t.load}
        </button>
      )}
    </div>
  );
}
