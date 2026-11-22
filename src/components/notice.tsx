import Link from "next/link";
import { Settings2, UserRoundCog } from "lucide-react";
import { Brand } from "./brand";
import { LanguageSwitch } from "./language-switch";
import { getLanguage } from "@/lib/i18n/server";
import { signOut } from "@/lib/auth/actions";

export async function Notice({ setup = false }: { setup?: boolean }) {
  const { locale, t } = await getLanguage();
  const Icon = setup ? Settings2 : UserRoundCog;
  return (
    <div className="notice-page">
      <header className="notice-top">
        <Brand />
        <LanguageSwitch locale={locale} t={t} />
      </header>
      <main className="notice-card" id="main-content">
        <Icon size={32} />
        <h1>{setup ? t.setupTitle : t.unavailableTitle}</h1>
        <p>{setup ? t.setupText : t.unavailableText}</p>
        {setup && (
          <ol>
            {t.setupSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        )}
        {setup ? (
          <Link className="button primary" href="/login">
            {t.back}
          </Link>
        ) : (
          <form action={signOut}>
            <button className="button primary">{t.signOut}</button>
          </form>
        )}
      </main>
    </div>
  );
}
