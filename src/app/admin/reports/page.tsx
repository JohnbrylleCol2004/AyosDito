import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { getLanguage } from "@/lib/i18n/server";
import { getAdminReports } from "@/lib/queries/admin-reports";
import {
  parseAdminFilters,
  adminReportsUrl,
} from "@/lib/validations/status-transitions";
import { AppShell } from "@/components/app-shell";
import { AdminReportFilters } from "@/components/admin/admin-report-filters";
import { AdminReportTable } from "@/components/admin/admin-report-table";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile("admin");
  const { t, locale } = await getLanguage();
  const a = t.adminReports;
  const filters = parseAdminFilters(await searchParams);
  const result = await getAdminReports(filters);
  if (!result.error && result.page !== filters.page)
    redirect(adminReportsUrl({ ...filters, page: result.page }));
  return (
    <AppShell profile={profile} section="reports">
      <div className="page-heading">
        <div className="eyebrow">{a.phase}</div>
        <h1>{a.manage}</h1>
        <p>{a.listIntro}</p>
      </div>
      <AdminReportFilters
        key={JSON.stringify(filters)}
        filters={filters}
        t={t}
      />
      {result.error ? (
        <p className="error-banner" role="alert">
          {a.loadError}
        </p>
      ) : (
        <>
          <p className="results-count">
            {new Intl.NumberFormat(locale).format(result.total)}{" "}
            {t.reports.results}
          </p>
          <section className="panel">
            <AdminReportTable reports={result.reports} t={t} locale={locale} />
          </section>
          {result.pages > 1 && (
            <nav className="pagination" aria-label={t.reports.page}>
              {result.page > 1 && (
                <Link
                  className="button"
                  href={adminReportsUrl({ ...filters, page: result.page - 1 })}
                >
                  {t.reports.previous}
                </Link>
              )}
              <span>
                {t.reports.page} {result.page} {t.reports.of} {result.pages}
              </span>
              {result.page < result.pages && (
                <Link
                  className="button"
                  href={adminReportsUrl({ ...filters, page: result.page + 1 })}
                >
                  {t.reports.next}
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </AppShell>
  );
}
