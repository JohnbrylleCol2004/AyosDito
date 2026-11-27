import { requireProfile } from "@/lib/auth/session";
import { getLanguage } from "@/lib/i18n/server";
import { enOperations, filOperations } from "@/lib/i18n/operations";
import { getOperations, getOperationsSummary } from "@/lib/queries/operations";
import { OperationsForm } from "./operations-form";
import { formatReportDate } from "@/lib/format";
export async function OperationsPanel({
  reportId,
  admin,
}: {
  reportId: string;
  admin: boolean;
}) {
  await requireProfile(admin ? "admin" : "resident");
  const { locale } = await getLanguage();
  const t = locale === "fil" ? filOperations : enOperations;
  const data = await getOperations(reportId, admin);
  const w = data.workflow ?? {
    assignee_id: null,
    responsible_office: null,
    target_date: null,
    duplicate_of: null,
    version: 0,
  };
  if (data.error || !data.status)
    return (
      <section className="panel operations-panel">
        <h2>{t.title}</h2>
        <p role="alert">{data.error === "migration" ? t.migration : t.load}</p>
      </section>
    );
  const pending = data.requests.some((r) => r.status === "pending");
  const fieldId = (name: string) => `operations-${reportId}-${name}`;
  return (
    <section className="panel operations-panel" aria-label={t.title}>
      <h2>{t.title}</h2>
      <p>{admin ? t.adminHint : t.residentHint}</p>
      {admin && (
        <>
          <h3>{t.workflow}</h3>
          <OperationsForm
            key={`workflow-${w.version}`}
            kind="workflow"
            reportId={reportId}
            version={w.version}
            t={t}
            submit={t.save}
          >
            <div className="field">
              <label htmlFor={fieldId("assignee")}>{t.assignee}</label>
              <select
                id={fieldId("assignee")}
                name="assignee_id"
                defaultValue={w.assignee_id ?? ""}
              >
                <option value="">{t.none}</option>
                {data.admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor={fieldId("office")}>{t.office}</label>
              <input
                id={fieldId("office")}
                name="responsible_office"
                maxLength={120}
                defaultValue={w.responsible_office ?? ""}
              />
            </div>
            <div className="field">
              <label htmlFor={fieldId("target")}>{t.target}</label>
              <input
                id={fieldId("target")}
                name="target_date"
                type="date"
                defaultValue={w.target_date ?? ""}
              />
            </div>
            <div className="field">
              <label htmlFor={fieldId("duplicate")}>{t.duplicate}</label>
              <select
                id={fieldId("duplicate")}
                name="duplicate_of"
                defaultValue={w.duplicate_of ?? ""}
                aria-describedby={fieldId("duplicate-hint")}
              >
                <option value="">{t.none}</option>
                {w.duplicate_of &&
                  !data.duplicates.some((r) => r.id === w.duplicate_of) && (
                    <option value={w.duplicate_of}>{w.duplicate_of}</option>
                  )}
                {data.duplicates.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.tracking_no} - {r.title}
                  </option>
                ))}
              </select>
              <p id={fieldId("duplicate-hint")}>{t.duplicateHint}</p>
            </div>
          </OperationsForm>
          <h3>{t.notes}</h3>
          <p>{t.privateNote}</p>
          <OperationsForm
            kind="note"
            reportId={reportId}
            t={t}
            submit={t.addNote}
          >
            <div className="field">
              <label htmlFor={fieldId("internal-note")}>{t.note}</label>
              <textarea
                id={fieldId("internal-note")}
                name="note"
                required
                minLength={1}
                maxLength={2000}
                rows={3}
              />
            </div>
          </OperationsForm>
          {data.notes.length ? (
            <ul className="report-timeline">
              {data.notes.map((n) => (
                <li key={n.id}>
                  <time dateTime={n.created_at}>
                    {formatReportDate(n.created_at, locale, true)}
                  </time>
                  <p style={{ whiteSpace: "pre-wrap" }}>{n.note}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>{t.emptyNotes}</p>
          )}
          {data.feedback && (
            <>
              <h3>{t.feedback}</h3>
              <p>
                {t.rating}: {data.feedback.rating}/5
              </p>
              <p style={{ whiteSpace: "pre-wrap" }}>{data.feedback.comment}</p>
            </>
          )}
        </>
      )}
      {!admin && data.status === "resolved" && (
        <>
          <h3>{t.feedback}</h3>
          <p>{t.feedbackHint}</p>
          <OperationsForm
            kind="feedback"
            reportId={reportId}
            t={t}
            submit={t.sendFeedback}
          >
            <div className="field">
              <label htmlFor={fieldId("rating")}>{t.rating}</label>
              <select
                id={fieldId("rating")}
                name="rating"
                defaultValue={data.feedback?.rating ?? 5}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}/5
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor={fieldId("comment")}>{t.comment}</label>
              <textarea
                id={fieldId("comment")}
                name="comment"
                maxLength={2000}
                rows={3}
                defaultValue={data.feedback?.comment ?? ""}
              />
            </div>
          </OperationsForm>
          {!pending && (
            <>
              <h3>{t.reopen}</h3>
              <p>{t.reopenHint}</p>
              <OperationsForm
                kind="reopen"
                reportId={reportId}
                t={t}
                submit={t.sendReopen}
              >
                <div className="field">
                  <label htmlFor={fieldId("reason")}>{t.reason}</label>
                  <textarea
                    id={fieldId("reason")}
                    name="reason"
                    required
                    minLength={10}
                    maxLength={2000}
                    rows={4}
                  />
                </div>
              </OperationsForm>
            </>
          )}
        </>
      )}
      <h3>{t.requests}</h3>
      {data.requests.length ? (
        data.requests.map((r) => (
          <article key={r.id} className="operations-request">
            <p>
              <strong>{t[r.status]}</strong>
            </p>
            <p style={{ whiteSpace: "pre-wrap" }}>{r.reason}</p>
            {r.review_note && (
              <p style={{ whiteSpace: "pre-wrap" }}>{r.review_note}</p>
            )}
            {admin && r.status === "pending" && (
              <OperationsForm
                key={`${r.id}-${w.version}`}
                kind="review"
                reportId={reportId}
                requestId={r.id}
                version={w.version}
                t={t}
              >
                <div className="field">
                  <label htmlFor={`review-${r.id}`}>{t.reviewNote}</label>
                  <textarea
                    id={`review-${r.id}`}
                    name="note"
                    required
                    minLength={1}
                    maxLength={2000}
                    rows={3}
                  />
                </div>
                <div className="engagement-actions">
                  <button
                    className="button primary"
                    name="approve"
                    value="true"
                  >
                    {t.approve}
                  </button>
                  <button className="button" name="approve" value="false">
                    {t.reject}
                  </button>
                </div>
              </OperationsForm>
            )}
          </article>
        ))
      ) : (
        <p>{t.noRequests}</p>
      )}
    </section>
  );
}
export async function OperationsSummary() {
  await requireProfile("admin");
  const { locale } = await getLanguage();
  const t = locale === "fil" ? filOperations : enOperations;
  const { summary, error } = await getOperationsSummary();
  return (
    <section className="panel operations-panel">
      <h2>{t.summary}</h2>
      {error || !summary ? (
        <p role="alert">{error === "migration" ? t.migration : t.load}</p>
      ) : (
        <dl className="operations-summary">
          {(
            ["unassigned", "overdue", "due_today", "reopen_pending"] as const
          ).map((key) => (
            <div key={key}>
              <dt>{t[key]}</dt>
              <dd>{summary[key]}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
