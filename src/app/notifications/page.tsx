import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { getLanguage } from "@/lib/i18n/server";
import { getNotifications } from "@/lib/queries/engagement";
import { AppShell } from "@/components/app-shell";
import { ReadButton } from "@/components/engagement/read-button";
export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile();
  const { t, locale } = await getLanguage();
  const e = t.engagement;
  const params = await searchParams;
  const requested = Number(params.page);
  const page =
    Number.isSafeInteger(requested) && requested > 0
      ? Math.min(requested, 100000)
      : 1;
  const result = await getNotifications(page);
  if (!result.error && result.page !== page)
    redirect(`/notifications?page=${result.page}`);
  const pages = Math.max(1, Math.ceil(result.total / 12));
  return (
    <AppShell profile={profile} section="notifications">
      <div className="report-page-heading">
        <div className="page-heading">
          <h1>{e.notifications}</h1>
          <p>{e.notificationIntro}</p>
        </div>
        {!result.error && result.unread > 0 && <ReadButton t={e} />}
      </div>
      {result.error ? (
        <p className="error-banner" role="alert">
          {e.loadError}
        </p>
      ) : result.notifications.length ? (
        <ul className="notification-list notification-inbox">
          {result.notifications.map((n) => (
            <li className={`panel ${n.is_read ? "" : "is-unread"}`} key={n.id}>
              <div>
                <h2>{e[n.title_key]}</h2>
                <p>{e[n.message_key]}</p>
                <time dateTime={n.created_at}>
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Manila",
                  }).format(new Date(n.created_at))}
                </time>
              </div>
              <div className="engagement-actions">
                <Link className="button" href={`/reports/${n.report_id}`}>
                  {e.openReport}
                </Link>
                {!n.is_read ? (
                  <ReadButton id={n.id} t={e} />
                ) : (
                  <span>{e.read}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <section className="panel empty-state">
          <h2>{e.noNotifications}</h2>
        </section>
      )}
      {!result.error && (page > 1 || pages > 1) && (
        <nav className="pagination" aria-label={e.page}>
          {page > 1 && (
            <Link className="button" href={`/notifications?page=${page - 1}`}>
              {e.previous}
            </Link>
          )}
          <span>
            {e.page} {page} {e.of} {pages}
          </span>
          {page < pages && (
            <Link className="button" href={`/notifications?page=${page + 1}`}>
              {e.next}
            </Link>
          )}
        </nav>
      )}
    </AppShell>
  );
}
