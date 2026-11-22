import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import type { ReportSummary } from "@/lib/queries/reports";
import type { ReportsDictionary } from "@/lib/i18n/reports";
import type { Locale } from "@/lib/i18n/dictionaries";
import { ReportStatusBadge } from "./report-status-badge";

export function formatReportDate(value: string, locale: Locale, time = false) {
  return new Intl.DateTimeFormat(locale === "fil" ? "fil-PH" : "en-PH", {
    dateStyle: "medium",
    ...(time ? { timeStyle: "short" as const } : {}),
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

export function ReportCard({
  report,
  t,
  locale,
  basePath = "/reports",
}: {
  report: ReportSummary;
  t: ReportsDictionary;
  locale: Locale;
  basePath?: "/reports" | "/admin/reports";
}) {
  return (
    <Link
      href={`${basePath}/${report.id}`}
      className="report-card"
      aria-label={`${report.tracking_no}: ${report.title}`}
    >
      <div className="report-card-top">
        <span className="tracking-label">{report.tracking_no}</span>
        <ReportStatusBadge status={report.status} t={t} />
      </div>
      <h3>
        {report.title}
        <ArrowUpRight size={17} aria-hidden="true" />
      </h3>
      <p className="report-preview">{report.description}</p>
      <div className="report-card-meta">
        <span>{t.categories[report.category]}</span>
        <span>
          <MapPin size={13} aria-hidden="true" />
          {report.zone}
        </span>
        <time dateTime={report.created_at}>
          {formatReportDate(report.created_at, locale)}
        </time>
      </div>
    </Link>
  );
}
