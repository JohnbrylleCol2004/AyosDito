"use client";
import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";
import {
  changeReportStatus,
  type StatusFormState,
} from "@/lib/actions/admin-reports";
import {
  allowedTransitions,
  validateStatusChange,
  type StatusErrors,
} from "@/lib/validations/status-transitions";
import type { ReportStatus } from "@/types/reports";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function StatusUpdateForm({
  id,
  status,
  version,
  t,
}: {
  id: string;
  status: ReportStatus;
  version: number;
  t: Dictionary;
}) {
  const a = t.adminReports;
  const choices = allowedTransitions(status);
  const [target, setTarget] = useState<string>(choices[0] ?? "");
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [errors, setErrors] = useState<StatusErrors | null>(null);
  const [state, action, pending] = useActionState<StatusFormState, FormData>(
    changeReportStatus,
    {},
  );
  const visibleErrors = errors ?? state.errors ?? {};
  if (!choices.length) return <p className="admin-terminal">{a.terminal}</p>;
  const labels = {
    in_progress: a.accept,
    rejected: a.reject,
    resolved: a.resolve,
  };
  const noteLabel =
    target === "rejected"
      ? a.rejectionNote
      : target === "resolved"
        ? a.resolutionNote
        : a.acceptanceNote;
  return (
    <form
      className="status-update-form"
      action={action}
      noValidate
      onSubmit={(event) => {
        const checked = validateStatusChange({
          report_id: id,
          target,
          note,
          version: String(version),
          confirmed: "yes",
        });
        setErrors(null);
        if (!checked.ok) {
          event.preventDefault();
          setErrors(checked.errors);
          (
            event.currentTarget.elements.namedItem(
              checked.errors.note ? "note" : "target",
            ) as HTMLElement | null
          )?.focus();
          return;
        }
        const submitter = (event.nativeEvent as SubmitEvent)
          .submitter as HTMLButtonElement | null;
        if (submitter?.name !== "confirmed") {
          event.preventDefault();
          setConfirming(true);
        }
      }}
    >
      <input type="hidden" name="report_id" value={id} />
      <input type="hidden" name="version" value={version} />
      <fieldset disabled={pending}>
        <div className="field">
          <label htmlFor="status-target">{a.target}</label>
          <select
            id="status-target"
            name="target"
            value={target}
            onChange={(e) => {
              setTarget(e.target.value);
              setConfirming(false);
              setErrors(null);
            }}
            aria-invalid={!!visibleErrors.target}
          >
            {choices.map((choice) => (
              <option value={choice} key={choice}>
                {labels[choice]}
              </option>
            ))}
          </select>
          {visibleErrors.target && (
            <p className="field-error" role="alert">
              {a.validation.target}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="status-note">{noteLabel}</label>
          <textarea
            id="status-note"
            name="note"
            rows={6}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setConfirming(false);
              setErrors({ ...visibleErrors, note: false });
            }}
            aria-describedby={`status-note-hint${visibleErrors.note ? " status-note-error" : ""}`}
            aria-invalid={!!visibleErrors.note}
            required
          />
          <p id="status-note-hint" className="field-hint">
            {a.noteHint}
          </p>
          {visibleErrors.note && (
            <p id="status-note-error" className="field-error" role="alert">
              {a.validation.note}
            </p>
          )}
        </div>
        {state.error && (
          <div className="error-banner" role="alert">
            <p>{a[state.error]}</p>
            <button
              type="button"
              className="button"
              onClick={() => window.location.reload()}
            >
              {a.refresh}
            </button>
          </div>
        )}
        {(visibleErrors.report_id ||
          visibleErrors.version ||
          visibleErrors.confirmed) && (
          <p className="error-banner" role="alert">
            {
              a.validation[
                visibleErrors.version
                  ? "version"
                  : visibleErrors.report_id
                    ? "report_id"
                    : "confirmed"
              ]
            }
          </p>
        )}
        {confirming ? (
          <section
            className="admin-confirmation"
            role="group"
            aria-labelledby="confirm-heading"
          >
            <h3 id="confirm-heading">{a.confirming}</h3>
            <p>{a.confirmText}</p>
            <strong>
              {t.reports.statuses[target as keyof typeof t.reports.statuses]}
            </strong>
            <p className="report-prose">{note.trim()}</p>
            <div className="admin-confirm-actions">
              <button
                type="button"
                className="button"
                onClick={() => setConfirming(false)}
              >
                {a.cancel}
              </button>
              <button
                name="confirmed"
                value="yes"
                className="button primary"
                disabled={pending}
              >
                {pending ? <LoaderCircle size={16} className="spin" /> : null}
                {pending ? a.updating : a.confirm}
              </button>
            </div>
          </section>
        ) : (
          <button className="button primary" disabled={pending}>
            {a.reviewChange}
          </button>
        )}
      </fieldset>
    </form>
  );
}
