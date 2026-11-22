import Link from "next/link";
import { currentProfile } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getLanguage } from "@/lib/i18n/server";
import {
  getCommunity,
  communityUrl,
  type CommunityFilters,
} from "@/lib/queries/engagement";
import { CommunityFrame } from "@/components/engagement/community-frame";
import { ConfirmationButton } from "@/components/engagement/confirmation-button";
import { ReportStatusBadge } from "@/components/reports/report-status-badge";
import { categories } from "@/types/reports";

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const value = (key: string, max = 120) =>
    typeof params[key] === "string"
      ? Array.from(params[key]).slice(0, max).join("")
      : "";
  const category = value("category");
  const status = value("status");
  const page = Number(value("page"));
  const filters: CommunityFilters = {
    q: value("q"),
    category: categories.includes(category as (typeof categories)[number])
      ? category
      : "",
    zone: value("zone", 80),
    status: ["in_progress", "resolved"].includes(status) ? status : "",
    sort: value("sort") === "confirmed" ? "confirmed" : "newest",
    page: Number.isSafeInteger(page) && page > 0 ? Math.min(page, 100000) : 1,
  };
  const [{ t, locale }, result, profile] = await Promise.all([
    getLanguage(),
    getCommunity(filters),
    currentProfile(),
  ]);
  const e = t.engagement;
  if (!result.error && !result.issues.length && filters.page > 1)
    redirect(communityUrl({ ...filters, page: 1 }));
  const total = Number(result.issues[0]?.total_count ?? 0);
  const pages = Math.max(1, Math.ceil(total / 12));
  return (
    <CommunityFrame>
      <div className="page-heading">
        <div className="eyebrow">AyosDito</div>
        <h1>{e.community}</h1>
        <p>{e.intro}</p>
      </div>
      <p className="community-privacy">{e.privacy}</p>
      <form className="community-filters panel" action="/community">
        <div className="field">
          <label htmlFor="community-search">{e.search}</label>
          <input
            id="community-search"
            name="q"
            maxLength={120}
            defaultValue={filters.q}
          />
        </div>
        <div className="field">
          <label htmlFor="community-category">{t.reports.categoryLabel}</label>
          <select
            id="community-category"
            name="category"
            defaultValue={filters.category}
          >
            <option value="">{e.allCategories}</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {t.reports.categories[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="community-zone">{e.zone}</label>
          <input
            id="community-zone"
            name="zone"
            maxLength={80}
            defaultValue={filters.zone}
            placeholder={e.allZones}
          />
        </div>
        <div className="field">
          <label htmlFor="community-status">{e.status}</label>
          <select
            id="community-status"
            name="status"
            defaultValue={filters.status}
          >
            <option value="">{e.allStatuses}</option>
            {(["in_progress", "resolved"] as const).map((s) => (
              <option key={s} value={s}>
                {t.reports.statuses[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="community-sort">{t.reports.sort}</label>
          <select id="community-sort" name="sort" defaultValue={filters.sort}>
            <option value="newest">{e.newest}</option>
            <option value="confirmed">{e.confirmedSort}</option>
          </select>
        </div>
        <button className="button primary">{e.apply}</button>
      </form>
      {result.error ? (
        <p role="alert" className="error-banner">
          {e.loadError}
        </p>
      ) : result.issues.length ? (
        <div className="reports-grid">
          {result.issues.map((issue) => (
            <article className="panel community-card" key={issue.id}>
              <div className="engagement-actions">
                <span>{t.reports.categories[issue.category]}</span>
                <ReportStatusBadge status={issue.status} t={t.reports} />
              </div>
              <h2>
                <Link href={`/community/${issue.id}`}>
                  {issue.public_title}
                </Link>
              </h2>
              <p className="report-prose">{issue.public_summary}</p>
              <p>{issue.public_zone}</p>
              <p>
                {new Intl.NumberFormat(locale).format(issue.confirmation_count)}{" "}
                {e.confirmations}
              </p>
              {profile?.role === "resident" ? (
                <ConfirmationButton
                  id={issue.id}
                  confirmed={issue.viewer_confirmed}
                  t={e}
                />
              ) : !profile ? (
                <Link href="/login">{e.signIn}</Link>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <section className="panel empty-state">
          <h2>{e.empty}</h2>
        </section>
      )}
      {!result.error && (filters.page > 1 || pages > 1) && (
        <nav className="pagination" aria-label={e.page}>
          {filters.page > 1 && (
            <Link
              className="button"
              href={communityUrl({ ...filters, page: filters.page - 1 })}
            >
              {e.previous}
            </Link>
          )}
          <span>
            {e.page} {filters.page}
            {total > 0 ? ` ${e.of} ${pages}` : ""}
          </span>
          {filters.page < pages && (
            <Link
              className="button"
              href={communityUrl({ ...filters, page: filters.page + 1 })}
            >
              {e.next}
            </Link>
          )}
        </nav>
      )}
    </CommunityFrame>
  );
}
