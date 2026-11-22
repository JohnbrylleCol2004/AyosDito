import Link from "next/link";
import { getLanguage } from "@/lib/i18n/server";
import { getNotifications } from "@/lib/queries/engagement";
export async function NotificationSummary() {
  const { t } = await getLanguage();
  const e = t.engagement;
  const result = await getNotifications(1, 3);
  return (
    <section className="panel engagement-panel">
      <div className="engagement-actions">
        <h2>{e.notifications}</h2>
        <Link href="/notifications">{e.viewAll}</Link>
      </div>
      {result.error ? (
        <p role="alert">{e.loadError}</p>
      ) : result.notifications.length ? (
        <ul className="notification-list">
          {result.notifications.map((n) => (
            <li key={n.id}>
              <Link href={`/reports/${n.report_id}`}>{e[n.message_key]}</Link>
              {!n.is_read && (
                <span className="notification-unread">{e.unread}</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>{e.noNotifications}</p>
      )}
    </section>
  );
}
