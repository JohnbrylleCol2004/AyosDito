import Link from "next/link";
import { currentProfile } from "@/lib/auth/session";
import { getLanguage } from "@/lib/i18n/server";
import { AppShell } from "@/components/app-shell";
import { Brand } from "@/components/brand";
import { LanguageSwitch } from "@/components/language-switch";
export async function CommunityFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await currentProfile();
  const { t, locale } = await getLanguage();
  if (profile)
    return (
      <AppShell profile={profile} section="community">
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
          <Link href="/install">{t.pwa.link}</Link>
          <LanguageSwitch locale={locale} t={t} />
        </div>
      </header>
      <main id="main-content">{children}</main>
    </div>
  );
}
