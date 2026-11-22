import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { getLanguage } from "@/lib/i18n/server";
import { getAdminReport } from "@/lib/queries/admin-reports";
import { getReportHistory } from "@/lib/queries/reports";
import { isUuid, parseReportFilters } from "@/lib/validations/reports";
import { AppShell } from "@/components/app-shell";
import { ReportStatusBadge } from "@/components/reports/report-status-badge";
import { ReportTimeline } from "@/components/reports/report-timeline";
import { formatReportDate } from "@/components/reports/report-card";
import { StatusUpdateForm } from "@/components/admin/status-update-form";
import { EvidenceSection } from "@/components/evidence-section";
import { ModerationPanel } from "@/components/engagement/moderation-panel";

export default async function AdminReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile("admin");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { t, locale } = await getLanguage();
  const a = t.adminReports;
  const r = t.reports;
  const { report, error } = await getAdminReport(id);
  if (error)
    return (
      <AppShell profile={profile} section="reports">
        <p className="error-banner" role="alert">
          {a.loadError}
        </p>
      </AppShell>
    );
  if (!report) notFound();
  const search = await searchParams;
  const page = parseReportFilters({ page: search.history }).page;
  const history = await getReportHistory(id, page);
  if (!history.error && history.page !== page)
    redirect(`/admin/reports/${id}?history=${history.page}`);
  return (
    <AppShell profile={profile} section="reports">
      <Link className="back-link" href="/admin/reports">
        ← {a.back}
      </Link>
      {search.updated === "1" && (
        <p className="success-banner" role="status">
          {a.success}
        </p>
      )}
      <div className="report-detail-heading">
        <div>
          <div className="eyebrow">
            {r.tracking} · {report.tracking_no}
          </div>
          <h1>{report.title}</h1>
        </div>
        <ReportStatusBadge status={report.status} t={r} />
      </div>
      <div className="report-detail-grid">
        <div>
          <section className="panel">
            <div className="panel-heading">
              <h2>{r.details}</h2>
            </div>
            <div className="report-detail-body">
              <dl className="report-facts">
                <div>
                  <dt>{a.reporter}</dt>
                  <dd>{report.reporter?.full_name ?? a.notAvailable}</dd>
                </div>
                <div>
                  <dt>{a.reporterZone}</dt>
                  <dd>{report.reporter?.zone ?? t.notSet}</dd>
                </div>
                <div>
                  <dt>{r.categoryLabel}</dt>
                  <dd>{r.categories[report.category]}</dd>
                </div>
                <div>
                  <dt>{r.zoneLabel}</dt>
                  <dd>{report.zone}</dd>
                </div>
                <div>
                  <dt>{r.submitted}</dt>
                  <dd>
                    <time dateTime={report.created_at}>
                      {formatReportDate(report.created_at, locale, true)}
                    </time>
                  </dd>
                </div>
                <div>
                  <dt>{r.updated}</dt>
                  <dd>
                    <time dateTime={report.updated_at}>
                      {formatReportDate(report.updated_at, locale, true)}
                    </time>
                  </dd>
                </div>
              </dl>
              <h2 className="detail-label">{r.descriptionLabel}</h2>
              <p className="report-prose">{report.description}</p>
              {report.location_details && (
                <>
                  <h2 className="detail-label">{r.locationLabel}</h2>
                  <p className="report-prose">{report.location_details}</p>
                </>
              )}
            </div>
          </section>
          <section className="panel admin-history">
            <div className="panel-heading">
              <h2>{r.timeline}</h2>
            </div>
            {history.error ? (
              <p className="error-banner" role="alert">
                {a.loadError}
              </p>
            ) : (
              <>
                <ReportTimeline
                  report={report}
                  updates={history.updates}
                  total={history.total}
                  t={r}
                  locale={locale}
                />
                {history.pages > 1 && (
                  <nav
                    className="pagination history-pagination"
                    aria-label={r.timelinePage}
                  >
                    {history.page > 1 && (
                      <Link
                        className="button"
                        href={`/admin/reports/${id}?history=${history.page - 1}`}
                      >
                        {r.previous}
                      </Link>
                    )}
                    <span>
                      {history.page} {r.of} {history.pages}
                    </span>
                    {history.page < history.pages && (
                      <Link
                        className="button"
                        href={`/admin/reports/${id}?history=${history.page + 1}`}
                      >
                        {r.next}
                      </Link>
                    )}
                  </nav>
                )}
              </>
            )}
          </section>
        </div>
        <section className="panel admin-review-panel">
          <div className="panel-heading">
            <h2>{a.review}</h2>
          </div>
          <StatusUpdateForm
            key={`${id}-${report.status_version}`}
            id={id}
            status={report.status}
            version={report.status_version}
            t={t}
          />
        </section>
      </div>
      <EvidenceSection
        reportId={id}
        role="admin"
        status={report.status}
        page={parseReportFilters({ page: search.photos }).page}
      />
      <ModerationPanel reportId={id} status={report.status} />
    </AppShell>
  );
}
