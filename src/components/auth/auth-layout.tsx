import Link from "next/link";
import { Brand } from "@/components/brand";
import { LanguageSwitch } from "@/components/language-switch";
import { getLanguage } from "@/lib/i18n/server";
import { accountsDictionary } from "@/lib/i18n/accounts";
export async function AuthLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { locale, t } = await getLanguage();
  const a = accountsDictionary(locale);
  return (
    <main className="login-page" id="main-content">
      <section className="login-story">
        <Brand light />
        <div className="story-content">
          <h1>{t.community}</h1>
          <p>{t.intro}</p>
        </div>
      </section>
      <section className="login-side">
        <div className="login-top">
          <LanguageSwitch locale={locale} t={t} />
        </div>
        <div className="login-content">
          <h2>{title}</h2>
          {children}
          <p>
            <Link href="/login">{a.login}</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
