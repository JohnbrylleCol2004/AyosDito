import Link from "next/link";
import type { AdminReport } from "@/lib/queries/admin-reports";
import type { Dictionary, Locale } from "@/lib/i18n/dictionaries";
import { ReportStatusBadge } from "@/components/reports/report-status-badge";
import { formatReportDate } from "@/components/reports/report-card";

export function AdminReportTable({
  reports,
  t,
  locale,
}: {
  reports: AdminReport[];
  t: Dictionary;
  locale: Locale;
}) {
  const a = t.adminReports;
  const r = t.reports;
  if (!reports.length)
    return (
      <div className="empty-state">
        <h2>{a.noReports}</h2>
        <p>{a.noReportsHint}</p>
      </div>
    );
  const labels = [
    r.tracking,
    r.categoryLabel,
    r.zoneLabel,
    a.reporter,
    r.submitted,
    r.updated,
    t.status,
    a.view,
  ];
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <caption className="sr-only">{a.manage}</caption>
        <thead>
          <tr>
            {labels.map((label) => (
              <th scope="col" key={label}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id}>
              <td data-label={r.tracking}>
                <Link
                  className="admin-report-title"
                  href={`/admin/reports/${report.id}`}
                >
                  <span>{report.tracking_no}</span>
                  <strong>{report.title}</strong>
                </Link>
              </td>
              <td data-label={r.categoryLabel}>
                {r.categories[report.category]}
              </td>
              <td data-label={r.zoneLabel}>{report.zone}</td>
              <td data-label={a.reporter}>
                {report.reporter?.full_name ?? a.notAvailable}
              </td>
              <td data-label={r.submitted}>
                <time dateTime={report.created_at}>
                  {formatReportDate(report.created_at, locale)}
                </time>
              </td>
              <td data-label={r.updated}>
                <time dateTime={report.updated_at}>
                  {formatReportDate(report.updated_at, locale, true)}
                </time>
              </td>
              <td data-label={t.status}>
                <ReportStatusBadge status={report.status} t={r} />
              </td>
              <td data-label={a.view}>
                <Link
                  className="table-action"
                  href={`/admin/reports/${report.id}`}
                >
                  {a.view}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
