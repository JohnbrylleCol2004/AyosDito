import Link from "next/link";
import { getLanguage } from "@/lib/i18n/server";
export default async function NotFound() {
  const { t } = await getLanguage();
  return (
    <main className="notice-page" id="main-content">
      <section className="notice-card">
        <h1>{t.notFound}</h1>
        <p>AyosDito</p>
        <Link className="button primary" href="/">
          {t.home}
        </Link>
      </section>
    </main>
  );
}
