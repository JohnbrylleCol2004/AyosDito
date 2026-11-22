import Link from "next/link";
import {
  ClipboardList,
  Clock3,
  LoaderCircle,
  CircleCheck,
  CircleX,
} from "lucide-react";
import {
  getAdminDashboard,
  type AdminReport,
} from "@/lib/queries/admin-reports";
import type { Profile } from "@/lib/auth/session";
import { getLanguage } from "@/lib/i18n/server";
import { categories } from "@/types/reports";
import { AppShell } from "@/components/app-shell";
import { ReportCard } from "@/components/reports/report-card";
import { CommunityAnalytics } from "@/components/admin/community-analytics";

export async function AdminDashboard({ profile }: { profile: Profile }) {
  const { t, locale } = await getLanguage();
  const a = t.adminReports;
  const r = t.reports;
  const data = await getAdminDashboard();
  const cards = [
    { key: "total", label: t.total, Icon: ClipboardList },
    { key: "pending_review", label: t.pending, Icon: Clock3 },
    { key: "in_progress", label: t.progress, Icon: LoaderCircle },
    { key: "resolved", label: t.resolved, Icon: CircleCheck },
    { key: "rejected", label: t.rejected, Icon: CircleX },
  ] as const;
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  return (
    <AppShell profile={profile}>
      <div className="page-heading">
        <div className="eyebrow">{a.phase}</div>
        <h1>{a.dashboard}</h1>
        <p>{a.intro}</p>
        <div className="dashboard-actions">
          <Link className="button primary" href="/admin/reports">
            {a.manage}
          </Link>
          <Link className="button" href="/admin/reports?status=pending_review">
            {a.reviewQueue}
          </Link>
        </div>
      </div>
      {!data.stats && (
        <p className="error-banner" role="alert">
          {a.migrationError}
        </p>
      )}
      <section className="stats-grid admin-stats" aria-label={t.overview}>
        {cards.map(({ key, label, Icon }) => (
          <article className="stat-card" key={key}>
            <div className="stat-head">
              <h2>{label}</h2>
              <span className="stat-icon">
                <Icon size={17} />
              </span>
            </div>
            <p className="stat-number">
              {data.stats ? number(data.stats[key]) : "—"}
            </p>
          </article>
        ))}
      </section>
      <div className="admin-dashboard-grid">
        {[
          { title: a.reviewQueue, result: data.pending },
          { title: a.recent, result: data.recent },
          { title: a.updated, result: data.updated },
        ].map(({ title, result }) => (
          <section className="panel" key={title}>
            <div className="panel-heading">
              <h2>{title}</h2>
            </div>
            {result.error ? (
              <p className="error-banner" role="alert">
                {a.loadError}
              </p>
            ) : result.data?.length ? (
              <div className="recent-reports">
                {(result.data as unknown as AdminReport[]).map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    t={r}
                    locale={locale}
                    basePath="/admin/reports"
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <h3>{a.noReports}</h3>
                <p>{a.noReportsHint}</p>
              </div>
            )}
          </section>
        ))}
      </div>
      <section className="panel admin-category-panel">
        <div className="panel-heading">
          <h2>{a.categories}</h2>
        </div>
        <dl className="admin-category-list">
          {categories.map((category) => (
            <div key={category}>
              <dt>{r.categories[category]}</dt>
              <dd>
                {data.stats
                  ? number(data.stats.categories[category] ?? 0)
                  : "—"}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <CommunityAnalytics />
    </AppShell>
  );
}
