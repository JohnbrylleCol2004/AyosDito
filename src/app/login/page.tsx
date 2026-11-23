import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { LanguageSwitch } from "@/components/language-switch";
import { LoginForm } from "@/components/login-form";
import { getLanguage } from "@/lib/i18n/server";
import { currentProfile } from "@/lib/auth/session";
import { homeForProfile } from "@/lib/auth/accounts";
import { accountsDictionary } from "@/lib/i18n/accounts";
import { supabaseConfig } from "@/lib/supabase/config";

export default async function LoginPage() {
  if (!supabaseConfig()) redirect("/setup");
  const profile = await currentProfile();
  if (profile) redirect(homeForProfile(profile));
  const { locale, t } = await getLanguage();
  const a = accountsDictionary(locale);
  return (
    <main className="login-page" id="main-content">
      <section className="login-story" aria-label="AyosDito">
        <Brand light />
        <div className="story-content">
          <h1>{t.community}</h1>
          <p>{t.intro}</p>
        </div>
        <div className="story-bottom">
          <ShieldCheck size={24} />
          <div>
            <strong>{t.secure}</strong>
            {t.secureText}
          </div>
        </div>
      </section>
      <section className="login-side">
        <div className="login-top">
          <LanguageSwitch locale={locale} t={t} />
        </div>
        <div className="login-content">
          <h2>{t.welcome}</h2>
          <p>{t.loginIntro}</p>
          <LoginForm t={t} />
          <p>
            <Link href="/register">{a.register}</Link>
          </p>
          <p>
            <Link href="/auth/forgot-password">{a.forgot}</Link>
          </p>
        </div>
        <footer className="login-footer">
          AyosDito · {t.privacy}
          <br />
          <Link href="/install">{t.pwa.link}</Link>
        </footer>
      </section>
    </main>
  );
}
