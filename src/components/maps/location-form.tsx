"use client";
import { useActionState, useState, useCallback } from "react";
import { saveLocation } from "./actions";
import { parseCoordinates } from "./coordinates";
import { ConsentMap } from "./consent-map";
import { mapText, type MapLocale } from "./text";
import styles from "./maps.module.css";
export function LocationForm({
  reportId,
  mode,
  latitude,
  longitude,
  locale,
}: {
  reportId: string;
  mode: "private" | "public";
  latitude: number | null;
  longitude: number | null;
  locale: MapLocale;
}) {
  const t = mapText[locale],
    prefix = `location-${mode}-${reportId}`;
  const [state, action, pending] = useActionState(saveLocation, {});
  const [lat, setLat] = useState(latitude === null ? "" : String(latitude)),
    [lng, setLng] = useState(longitude === null ? "" : String(longitude));
  const pair = parseCoordinates(lat, lng);
  const selected: [number, number] | null =
    pair?.latitude !== null &&
    pair?.latitude !== undefined &&
    pair.longitude !== null
      ? [pair.latitude, pair.longitude]
      : null;
  const pick = useCallback((a: number, b: number) => {
    setLat(a.toFixed(6));
    setLng(b.toFixed(6));
  }, []);
  return (
    <form action={action} className="engagement-form">
      <input type="hidden" name="report_id" value={reportId} />
      <input type="hidden" name="mode" value={mode} />
      <fieldset disabled={pending}>
        <div className={styles.controls}>
          <div className="field">
            <label htmlFor={`${prefix}-lat`}>{t.latitude}</label>
            <input
              id={`${prefix}-lat`}
              name="latitude"
              type="number"
              min={-90}
              max={90}
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor={`${prefix}-lng`}>{t.longitude}</label>
            <input
              id={`${prefix}-lng`}
              name="longitude"
              type="number"
              min={-180}
              max={180}
              step="any"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
            />
          </div>
        </div>
        <p>{t.pick}</p>
        <ConsentMap
          selected={selected}
          onPick={pick}
          locale={locale}
          privateLocation={mode === "private"}
        />
        <div className="engagement-actions">
          <button className="button primary" name="intent" value="save">
            {pending ? t.saving : t.save}
          </button>
          <button
            className="button"
            name="intent"
            value="remove"
            formNoValidate
          >
            {t.remove}
          </button>
        </div>
      </fieldset>
      {state.error && (
        <p className="error-banner" role="alert">
          {t[state.error]}
        </p>
      )}
      {state.saved && <p role="status">{t.saved}</p>}
    </form>
  );
}
