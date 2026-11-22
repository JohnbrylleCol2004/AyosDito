import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Inbox } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { getLanguage } from "@/lib/i18n/server";
import { parseReportFilters, reportListUrl } from "@/lib/validations/reports";
import { getResidentReports } from "@/lib/queries/reports";
import { AppShell } from "@/components/app-shell";
import { ReportFilters } from "@/components/reports/report-filters";
import { ReportCard } from "@/components/reports/report-card";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile("resident");
  const { t, locale } = await getLanguage();
  const r = t.reports;
  const filters = parseReportFilters(await searchParams);
  const result = await getResidentReports(profile, filters);
  if (!result.error && result.page !== filters.page)
    redirect(reportListUrl({ ...filters, page: result.page }));
  const filtered = !!(filters.q || filters.category || filters.status);
  return (
    <AppShell profile={profile} section="reports">
      <div className="report-page-heading">
        <div className="page-heading">
          <div className="eyebrow">{r.phase}</div>
          <h1>{r.title}</h1>
          <p>{r.listIntro}</p>
        </div>
        <Link className="button primary" href="/reports/new">
          <Plus size={17} />
          {r.newReport}
        </Link>
      </div>
      <ReportFilters key={JSON.stringify(filters)} filters={filters} t={r} />
      {result.error ? (
        <p className="error-banner" role="alert">
          {r.loadError}
        </p>
      ) : (
        <>
          <p className="results-count">
            {new Intl.NumberFormat(locale).format(result.total)} {r.results}
          </p>
          {result.reports.length ? (
            <div className="reports-grid">
              {result.reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  t={r}
                  locale={locale}
                />
              ))}
            </div>
          ) : (
            <section className="panel empty-state">
              <span className="empty-icon">
                <Inbox size={28} />
              </span>
              <h2>{filtered ? r.noMatches : r.empty}</h2>
              <p>{filtered ? r.noMatchesHint : r.emptyHint}</p>
            </section>
          )}
          {result.pages > 1 && (
            <nav className="pagination" aria-label={r.page}>
              {result.page > 1 && (
                <Link
                  className="button"
                  href={reportListUrl({ ...filters, page: result.page - 1 })}
                >
                  {r.previous}
                </Link>
              )}
              <span>
                {r.page} {result.page} {r.of} {result.pages}
              </span>
              {result.page < result.pages && (
                <Link
                  className="button"
                  href={reportListUrl({ ...filters, page: result.page + 1 })}
                >
                  {r.next}
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </AppShell>
  );
}
