import {
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  ChevronRight,
  ClipboardList,
  Plus,
  Users,
  Download,
} from "lucide-react";
import Link from "next/link";
import { Brand } from "./brand";
import { LanguageSwitch } from "./language-switch";
import { signOut } from "@/lib/auth/actions";
import type { Profile } from "@/lib/auth/session";
import { getLanguage } from "@/lib/i18n/server";
import { NotificationBell } from "@/components/engagement/notification-bell";

export async function AppShell({
  profile,
  children,
  section = "overview",
}: {
  profile: Profile;
  children: React.ReactNode;
  section?: "overview" | "reports" | "new" | "community" | "notifications";
}) {
  const { locale, t } = await getLanguage();
  const admin = profile.role === "admin";
  const title =
    section === "community"
      ? t.engagement.community
      : section === "notifications"
        ? t.engagement.notifications
        : section === "new"
          ? t.reports.newReport
          : section === "reports"
            ? admin
              ? t.adminReports.manage
              : t.reports.title
            : admin
              ? t.adminDashboard
              : t.dashboard;
  const initials = profile.full_name
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-section">{admin ? t.admin : t.resident}</div>
        <nav aria-label={t.navigation}>
          <Link
            className={`nav-link ${section === "overview" ? "active" : ""}`}
            href={admin ? "/admin" : "/dashboard"}
            aria-current={section === "overview" ? "page" : undefined}
          >
            <LayoutDashboard size={18} />
            {t.overview}
          </Link>
          <Link
            className={`nav-link ${section === "community" ? "active" : ""}`}
            href="/community"
            aria-current={section === "community" ? "page" : undefined}
          >
            <Users size={18} />
            {t.engagement.community}
          </Link>
          {admin && (
            <Link
              className={`nav-link ${section === "reports" ? "active" : ""}`}
              href="/admin/reports"
              aria-current={section === "reports" ? "page" : undefined}
            >
              <ClipboardList size={18} />
              {t.adminReports.manage}
            </Link>
          )}
          {!admin && (
            <>
              <Link
                className={`nav-link ${section === "reports" ? "active" : ""}`}
                href="/reports"
                aria-current={section === "reports" ? "page" : undefined}
              >
                <ClipboardList size={18} />
                {t.reports.title}
              </Link>
              <Link
                className={`nav-link ${section === "new" ? "active" : ""}`}
                href="/reports/new"
                aria-current={section === "new" ? "page" : undefined}
              >
                <Plus size={18} />
                {t.reports.newReport}
              </Link>
            </>
          )}
          <Link className="nav-link" href="/install">
            <Download size={18} />
            {t.pwa.link}
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <ShieldCheck size={20} />
            <p>{t.secureText}</p>
          </div>
          <div className="profile-chip">
            <span className="avatar" aria-hidden="true">
              {initials}
            </span>
            <div>
              <strong>{profile.full_name}</strong>
              <small>{admin ? t.admin : t.resident}</small>
            </div>
          </div>
          <form action={signOut}>
            <button className="logout">
              <LogOut size={16} />
              {t.signOut}
            </button>
          </form>
        </div>
      </aside>
      <div className="app-body">
        <header className="app-header">
          <div className="breadcrumb">
            <span>AyosDito</span>
            <ChevronRight size={13} />
            <strong>{title}</strong>
          </div>
          <div className="header-right">
            <NotificationBell />
            <span className="connection">{t.connected}</span>
            <LanguageSwitch locale={locale} t={t} />
          </div>
        </header>
        <main className="dashboard-content" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
