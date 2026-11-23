import Link from "next/link";
import { CommunityFrame } from "@/components/engagement/community-frame";
import { getLanguage } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { ConsentMap } from "@/components/maps/consent-map";
import { mapText, type PublicMapIssue } from "@/components/maps/text";
import styles from "@/components/maps/maps.module.css";
export default async function CommunityMapPage() {
  const { locale, t: dictionary } = await getLanguage();
  const t = mapText[locale];
  const { data, error } = supabaseConfig()
    ? await (await createClient()).rpc("public_map_issues")
    : { data: null, error: { code: "CONFIG" } };
  const issues = (data ?? []) as PublicMapIssue[];
  return (
    <CommunityFrame section="map">
      <div className="page-heading">
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
      </div>
      <p>
        <Link href="/community">{t.back}</Link>
      </p>
      {error ? (
        <p role="alert" className="error-banner">
          {error.code === "CONFIG"
            ? t.setup
            : ["PGRST202", "42883", "42P01"].includes(error.code)
              ? t.migration
              : t.error}
        </p>
      ) : !issues.length ? (
        <section className="panel">
          <p>{t.empty}</p>
        </section>
      ) : (
        <>
          <section className="panel operations-panel">
            <ConsentMap issues={issues} locale={locale} />
            <p>{t.limit}</p>
          </section>
          <section className="panel operations-panel">
            <h2>{t.list}</h2>
            <ul className={styles.list}>
              {issues.map((issue) => (
                <li key={issue.report_id}>
                  <Link href={`/community/${issue.report_id}`}>
                    {issue.public_title}
                  </Link>
                  <p>
                    {
                      dictionary.reports.categories[
                        issue.category as keyof typeof dictionary.reports.categories
                      ]
                    }{" "}
                    ·{" "}
                    {
                      dictionary.reports.statuses[
                        issue.status as keyof typeof dictionary.reports.statuses
                      ]
                    }{" "}
                    · {Number(issue.latitude).toFixed(2)},{" "}
                    {Number(issue.longitude).toFixed(2)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </CommunityFrame>
  );
}
