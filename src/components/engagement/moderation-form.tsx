"use client";
import { useActionState, useState } from "react";
import { savePublication } from "@/lib/actions/engagement";
import type { EngagementDictionary } from "@/lib/i18n/engagement";
export type PublicFields = {
  is_public: boolean;
  public_title: string | null;
  public_summary: string | null;
  public_zone: string | null;
};
export function ModerationForm({
  reportId,
  fields,
  t,
}: {
  reportId: string;
  fields: PublicFields;
  t: EngagementDictionary;
}) {
  const [state, action, pending] = useActionState(savePublication, {});
  const [title, setTitle] = useState(fields.public_title ?? "");
  const [summary, setSummary] = useState(fields.public_summary ?? "");
  const [zone, setZone] = useState(fields.public_zone ?? "");
  const [safe, setSafe] = useState(false);
  return (
    <form action={action} className="engagement-form">
      <input type="hidden" name="report_id" value={reportId} />
      <p>{fields.is_public ? t.published : t.unpublished}</p>
      <fieldset disabled={pending}>
        <div className="field">
          <label htmlFor="public-title">{t.publicTitle}</label>
          <input
            id="public-title"
            name="public_title"
            minLength={5}
            maxLength={120}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setSafe(false);
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="public-summary">{t.publicSummary}</label>
          <textarea
            id="public-summary"
            name="public_summary"
            rows={5}
            minLength={20}
            maxLength={500}
            value={summary}
            onChange={(event) => {
              setSummary(event.target.value);
              setSafe(false);
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="public-zone">{t.publicZone}</label>
          <input
            id="public-zone"
            name="public_zone"
            maxLength={80}
            value={zone}
            onChange={(event) => {
              setZone(event.target.value);
              setSafe(false);
            }}
          />
        </div>
        <label className="privacy-check">
          <input
            type="checkbox"
            name="safe"
            value="yes"
            checked={safe}
            onChange={(event) => setSafe(event.target.checked)}
          />
          {t.safe}
        </label>
        <div className="engagement-actions">
          <button className="button primary" name="published" value="true">
            {pending ? t.saving : t.publish}
          </button>
          {fields.is_public && (
            <button
              className="button"
              name="published"
              value="false"
              formNoValidate
            >
              {t.unpublish}
            </button>
          )}
        </div>
      </fieldset>
      {state.error && (
        <p className="error-banner" role="alert">
          {t.error}
        </p>
      )}
      {state.saved && <p role="status">{t.saved}</p>}
    </form>
  );
}
