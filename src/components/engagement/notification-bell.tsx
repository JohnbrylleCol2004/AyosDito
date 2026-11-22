import Link from "next/link";
import { Bell } from "lucide-react";
import { getLanguage } from "@/lib/i18n/server";
import { getNotifications } from "@/lib/queries/engagement";
export async function NotificationBell() {
  const { t } = await getLanguage();
  const result = await getNotifications(1, 1);
  return (
    <Link
      href="/notifications"
      className="notification-bell"
      aria-label={`${t.engagement.notifications}${result.error ? "" : `, ${result.unread} ${t.engagement.unread}`}`}
    >
      <Bell size={19} />
      {!result.error && result.unread > 0 && (
        <span>{result.unread > 99 ? "99+" : result.unread}</span>
      )}
    </Link>
  );
}
