import Link from "next/link";
import { redirect } from "next/navigation";
import { currentProfile } from "@/lib/auth/session";
import { getLanguage } from "@/lib/i18n/server";
import { AppShell } from "@/components/app-shell";
import { Brand } from "@/components/brand";
import { LanguageSwitch } from "@/components/language-switch";
export async function CommunityFrame({
  children,
  section = "community",
}: {
  children: React.ReactNode;
  section?: "community" | "map";
}) {
  const profile = await currentProfile();
  const { t, locale } = await getLanguage();
  if (profile && profile.approval_status !== "approved")
    redirect("/account-pending");
  if (profile)
    return (
      <AppShell profile={profile} section={section}>
        {children}
      </AppShell>
    );
  return (
    <div className="public-community">
      <header className="public-community-header">
        <Link href="/" aria-label="AyosDito">
          <Brand />
        </Link>
        <div className="pwa-public-actions">
          <Link href="/community/map">
            {locale === "fil" ? "Mapa ng mga isyu" : "Issue map"}
          </Link>
          <Link href="/install">{t.pwa.link}</Link>
          <LanguageSwitch locale={locale} t={t} />
        </div>
      </header>
      <main id="main-content">{children}</main>
    </div>
  );
}
