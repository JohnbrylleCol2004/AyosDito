import { CircleCheck, Clock3 } from "lucide-react";
import type { Report, ReportUpdate } from "@/types/reports";
import type { ReportsDictionary } from "@/lib/i18n/reports";
import type { Locale } from "@/lib/i18n/dictionaries";
import { ReportStatusBadge } from "./report-status-badge";
import { formatReportDate } from "./report-card";

export function ReportTimeline({
  report,
  updates,
  total,
  t,
  locale,
}: {
  report: Report;
  updates: ReportUpdate[];
  total: number;
  t: ReportsDictionary;
  locale: Locale;
}) {
  return (
    <>
      <ol className="report-timeline">
        <li>
          <span className="timeline-marker">
            <CircleCheck size={17} />
          </span>
          <div>
            <h3>{t.submissionEvent}</h3>
            <time dateTime={report.created_at}>
              {formatReportDate(report.created_at, locale, true)}
            </time>
            <ReportStatusBadge status="pending_review" t={t} />
          </div>
        </li>
        {updates.map((update) => (
          <li key={update.id}>
            <span className="timeline-marker">
              <Clock3 size={17} />
            </span>
            <div>
              <h3>{t.officialUpdate}</h3>
              <time dateTime={update.created_at}>
                {formatReportDate(update.created_at, locale, true)}
              </time>
              <div className="timeline-statuses">
                <ReportStatusBadge status={update.old_status} t={t} />
                <span aria-hidden="true">→</span>
                <ReportStatusBadge status={update.new_status} t={t} />
              </div>
              <p className="report-prose">{update.note}</p>
            </div>
          </li>
        ))}
      </ol>
      {total === 0 && (
        <p className="timeline-note">
          {report.status === "pending_review" ? t.awaiting : t.noUpdates}
        </p>
      )}
      <p className="timezone-note">{t.timezone}</p>
    </>
  );
}
