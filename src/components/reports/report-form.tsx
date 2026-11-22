"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { submitReport, type ReportFormState } from "@/lib/actions/reports";
import { validateReport } from "@/lib/validations/reports";
import {
  categories,
  type ReportInput,
  type ReportErrors,
  type ReportField,
} from "@/types/reports";
import type { ReportsDictionary } from "@/lib/i18n/reports";
import type { EvidenceDictionary } from "@/lib/i18n/evidence";
import { EvidencePicker } from "@/components/evidence/evidence-picker";

export function ReportForm({
  t,
  submissionKey,
  zone,
  evidenceT,
}: {
  t: ReportsDictionary;
  submissionKey: string;
  zone: string;
  evidenceT: EvidenceDictionary;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [values, setValues] = useState<ReportInput>({
    title: "",
    category: "",
    description: "",
    zone,
    location_details: "",
    submission_key: submissionKey,
  });
  const [state, action, pending] = useActionState<ReportFormState, FormData>(
    async (previous, form) => {
      form.delete("photos");
      files.forEach((file) => form.append("photos", file));
      return submitReport(previous, form);
    },
    {},
  );
  const [clientErrors, setClientErrors] = useState<ReportErrors | null>(null);
  const errors = clientErrors ?? state.errors ?? {};
  function update(field: ReportField, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
    setClientErrors({ ...errors, [field]: false });
  }
  function feedback(field: ReportField, hint: string) {
    return (
      <>
        <p className="field-hint" id={`${field}-hint`}>
          {hint}
        </p>
        {errors[field] && (
          <p className="field-error" id={`${field}-error`} role="alert">
            {t.validation[field]}
          </p>
        )}
      </>
    );
  }
  const accessibility = (field: ReportField) => ({
    "aria-invalid": !!errors[field],
    "aria-describedby": `${field}-hint${errors[field] ? ` ${field}-error` : ""}`,
  });
  return (
    <form
      className="report-form panel"
      action={action}
      noValidate
      onSubmit={(event) => {
        const result = validateReport(values);
        setClientErrors(null);
        if (!result.ok) {
          event.preventDefault();
          setClientErrors(result.errors);
          const first = Object.keys(result.errors)[0];
          (
            event.currentTarget.elements.namedItem(first) as HTMLElement | null
          )?.focus();
        }
      }}
    >
      <input
        type="hidden"
        name="submission_key"
        value={values.submission_key}
      />
      <fieldset disabled={pending || !!state.reportId}>
        <div className="report-form-fields">
          <div className="field span-full">
            <label htmlFor="report-title">{t.titleLabel}</label>
            <input
              id="report-title"
              name="title"
              value={values.title}
              onChange={(e) => update("title", e.target.value)}
              required
              {...accessibility("title")}
            />
            {feedback("title", t.titleHint)}
          </div>
          <div className="field">
            <label htmlFor="report-category">{t.categoryLabel}</label>
            <select
              id="report-category"
              name="category"
              value={values.category}
              onChange={(e) => update("category", e.target.value)}
              required
              aria-invalid={!!errors.category}
              aria-describedby={errors.category ? "category-error" : undefined}
            >
              <option value="">{t.chooseCategory}</option>
              {categories.map((category) => (
                <option value={category} key={category}>
                  {t.categories[category]}
                </option>
              ))}
            </select>
            {errors.category && (
              <p id="category-error" className="field-error" role="alert">
                {t.validation.category}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="report-zone">{t.zoneLabel}</label>
            <input
              id="report-zone"
              name="zone"
              value={values.zone}
              onChange={(e) => update("zone", e.target.value)}
              required
              {...accessibility("zone")}
            />
            {feedback("zone", t.zoneHint)}
          </div>
          <div className="field span-full">
            <label htmlFor="report-description">{t.descriptionLabel}</label>
            <textarea
              id="report-description"
              name="description"
              rows={7}
              value={values.description}
              onChange={(e) => update("description", e.target.value)}
              required
              {...accessibility("description")}
            />
            {feedback("description", t.descriptionHint)}
          </div>
          <div className="field span-full">
            <label htmlFor="report-location">
              {t.locationLabel} <span className="muted">({t.optional})</span>
            </label>
            <textarea
              id="report-location"
              name="location_details"
              rows={2}
              value={values.location_details}
              onChange={(e) => update("location_details", e.target.value)}
              {...accessibility("location_details")}
            />
            {feedback("location_details", t.locationHint)}
          </div>
        </div>
        <EvidencePicker
          files={files}
          onChange={setFiles}
          disabled={pending || !!state.reportId}
          t={evidenceT}
        />
      </fieldset>
      {errors.submission_key && (
        <p className="error-banner" role="alert">
          {t.validation.submission_key}
        </p>
      )}
      {state.error && state.error !== "photoError" && (
        <p className="error-banner" role="alert">
          {t[state.error]}
        </p>
      )}
      {state.error === "photoError" && (
        <div className="evidence-saved-report" role="alert">
          <p>{state.reportId ? evidenceT.photoError : t.photoError}</p>
          {state.reportId && (
            <Link
              className="button primary"
              href={`/reports/${state.reportId}`}
            >
              {evidenceT.savedReport}
            </Link>
          )}
        </div>
      )}
      <div className="report-form-actions">
        <Link className="button" href="/reports">
          {t.cancel}
        </Link>
        <button
          className="button primary"
          disabled={pending || !!state.reportId}
        >
          {pending ? (
            <LoaderCircle size={17} className="spin" />
          ) : (
            <ArrowRight size={17} />
          )}
          {pending ? t.submitting : t.submit}
        </button>
      </div>
    </form>
  );
}
