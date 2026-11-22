import { redirect } from "next/navigation";
import { ShieldCheck, Sprout, Users } from "lucide-react";
import { Brand } from "@/components/brand";
import { LanguageSwitch } from "@/components/language-switch";
import { LoginForm } from "@/components/login-form";
import { getLanguage } from "@/lib/i18n/server";
import { currentProfile } from "@/lib/auth/session";
import { homeForRole } from "@/lib/auth/rules";
import { supabaseConfig } from "@/lib/supabase/config";

export default async function LoginPage() {
  if (!supabaseConfig()) redirect("/setup");
  const profile = await currentProfile();
  if (profile) redirect(homeForRole(profile.role)!);
  const { locale, t } = await getLanguage();
  return (
    <main className="login-page" id="main-content">
      <section className="login-story" aria-label="AyosDito">
        <Brand light />
        <div className="story-content">
          <span className="story-tag">
            <Sprout size={13} />
            AYOSDITO · PARA SA BARANGAY
          </span>
          <h1>{t.community}</h1>
          <p>{t.intro}</p>
          <div className="story-line" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
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
          <div className="eyebrow">{t.foundation}</div>
          <h2>{t.welcome}</h2>
          <p>{t.loginIntro}</p>
          <LoginForm t={t} />
          <div className="demo-note">
            <Users size={19} />
            <div>
              <strong>{t.demo}</strong>
              {t.demoText}
            </div>
          </div>
        </div>
        <footer className="login-footer">AyosDito · {t.privacy}</footer>
      </section>
    </main>
  );
}
