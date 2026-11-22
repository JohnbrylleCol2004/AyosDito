import {
  ClipboardList,
  Clock3,
  CircleCheck,
  LoaderCircle,
  Inbox,
  Sprout,
  LockKeyhole,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth/session";
import { getLanguage } from "@/lib/i18n/server";
import { AppShell } from "./app-shell";
import { getRecentReports } from "@/lib/queries/reports";
import { ReportCard } from "./reports/report-card";
import { NotificationSummary } from "@/components/engagement/notification-summary";

export async function Dashboard({ profile }: { profile: Profile }) {
  const { t, locale } = await getLanguage();
  const supabase = await createClient();
  const statuses = [
    "pending_review",
    "in_progress",
    "resolved",
    "rejected",
  ] as const;
  const results = await Promise.all(
    statuses.map((status) => {
      let query = supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("status", status);
      if (profile.role === "resident")
        query = query.eq("reporter_id", profile.id);
      return query;
    }),
  );
  const failed = results.some((result) => result.error);
  const counts = results.map((result) => result.count ?? 0);
  const total = counts.reduce((a, b) => a + b, 0);
  const number = (value: number) =>
    failed ? "—" : new Intl.NumberFormat(locale).format(value);
  const admin = profile.role === "admin";
  const recent = await getRecentReports(profile);
  const statusLabels = [t.pending, t.progress, t.resolved, t.rejected];
  const cards = [
    { label: t.total, value: total, Icon: ClipboardList },
    { label: t.pending, value: counts[0], Icon: Clock3 },
    { label: t.progress, value: counts[1], Icon: LoaderCircle },
    { label: t.resolved, value: counts[2], Icon: CircleCheck },
  ];
  return (
    <AppShell profile={profile}>
      <div className="page-heading">
        <div className="eyebrow">{t.reports.phase}</div>
        <h1>
          {t.greeting}, {profile.full_name}.
        </h1>
        <p>{admin ? t.adminIntro : t.residentIntro}</p>
        {!admin && (
          <div className="dashboard-actions">
            <Link className="button primary" href="/reports/new">
              <Plus size={17} />
              {t.reports.newReport}
            </Link>
            <Link className="button" href="/reports">
              {t.reports.viewAll}
            </Link>
          </div>
        )}
      </div>
      {failed && (
        <p className="error-banner" role="alert">
          {t.dataError}
        </p>
      )}
      <section className="stats-grid" aria-label={t.overview}>
        {cards.map(({ label, value, Icon }) => (
          <article className="stat-card" key={label}>
            <div className="stat-head">
              <h2>{label}</h2>
              <span className="stat-icon">
                <Icon size={17} />
              </span>
            </div>
            <p className="stat-number">{number(value)}</p>
          </article>
        ))}
      </section>
      <div className="dashboard-grid">
        <div>
          <section className="panel">
            <div className="panel-heading">
              <h2>{admin ? t.communityReports : t.reports.recent}</h2>
              <span className="count-badge">{number(total)}</span>
            </div>
            {recent.error ? (
              <p className="error-banner" role="alert">
                {t.reports.loadError}
              </p>
            ) : recent.reports.length ? (
              <div className="recent-reports">
                {recent.reports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    t={t.reports}
                    locale={locale}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon">
                  <Inbox size={27} />
                </span>
                <h3>{t.reports.empty}</h3>
                <p>{admin ? t.reports.adminNext : t.reports.emptyHint}</p>
              </div>
            )}
          </section>
          <section className="phase-banner">
            <Sprout size={23} />
            <div>
              <h2>{t.reports.phase}</h2>
              <p>{admin ? t.reports.adminNext : t.reports.residentReady}</p>
            </div>
          </section>
        </div>
        <div className="dashboard-aside">
          <NotificationSummary />
          <section className="panel">
            <div className="panel-heading">
              <h2>{t.statusOverview}</h2>
            </div>
            <dl className="status-list">
              {statuses.map((status, i) => (
                <div className="status-row" key={status}>
                  <dt className="status-label">
                    <span className={`status-dot ${status}`} />
                    {statusLabels[i]}
                  </dt>
                  <dd>
                    <strong>{number(counts[i])}</strong>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="panel account-panel">
            <div className="panel-heading">
              <h2>{t.account}</h2>
            </div>
            <dl className="account-details">
              <div>
                <dt>{t.name}</dt>
                <dd>{profile.full_name}</dd>
              </div>
              <div>
                <dt>{t.role}</dt>
                <dd>{admin ? t.admin : t.resident}</dd>
              </div>
              <div>
                <dt>{t.zone}</dt>
                <dd>{profile.zone || t.notSet}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
      <footer className="dashboard-footer">
        <LockKeyhole size={12} />
        {t.privacy}
      </footer>
    </AppShell>
  );
}
