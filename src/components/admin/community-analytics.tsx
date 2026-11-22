import { requireProfile } from "@/lib/auth/session";
import { getLanguage } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

type Analytics = {
  zones: { zone: string; count: number }[];
  months: { month: string; count: number }[];
  resolution_samples: number;
  average_resolution_hours: number | null;
};
export async function CommunityAnalytics() {
  await requireProfile("admin");
  const { t, locale } = await getLanguage();
  const a = t.analytics;
  const db = await createClient();
  const result = await db.rpc("admin_community_analytics");
  if (result.error || !result.data)
    return (
      <section className="panel analytics-panel">
        <h2>{a.title}</h2>
        <p className="error-banner" role="alert">
          {a.error}
        </p>
      </section>
    );
  const data = result.data as Analytics;
  const max = Math.max(1, ...data.months.map((month) => month.count));
  const number = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  return (
    <section className="panel analytics-panel">
      <div className="panel-heading">
        <h2>{a.title}</h2>
      </div>
      <p className="analytics-hint">{a.hint}</p>
      <div className="analytics-grid">
        <section>
          <h3>{a.zones}</h3>
          {data.zones.length ? (
            <dl className="analytics-zones">
              {data.zones.map((zone) => (
                <div key={zone.zone}>
                  <dt>{zone.zone}</dt>
                  <dd>{number(zone.count)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>{a.empty}</p>
          )}
        </section>
        <section>
          <h3>{a.months}</h3>
          <table className="analytics-months">
            <thead>
              <tr>
                <th scope="col">{a.month}</th>
                <th scope="col">{a.count}</th>
              </tr>
            </thead>
            <tbody>
              {data.months.map((month) => (
                <tr key={month.month}>
                  <th scope="row">
                    {new Intl.DateTimeFormat(
                      locale === "fil" ? "fil-PH" : "en-PH",
                      {
                        month: "short",
                        year: "numeric",
                        timeZone: "Asia/Manila",
                      },
                    ).format(new Date(month.month + "-01T00:00:00+08:00"))}
                  </th>
                  <td>
                    <span
                      className="analytics-bar"
                      aria-hidden="true"
                      style={{
                        width: `${Math.max(0, (month.count / max) * 75)}%`,
                      }}
                    />
                    {number(month.count)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="resolution-average">
          <h3>{a.average}</h3>
          {data.average_resolution_hours === null ? (
            <p>{a.insufficient}</p>
          ) : (
            <p className="average-value">
              {number(data.average_resolution_hours)} <span>{a.hours}</span>
            </p>
          )}
          <p>
            {number(data.resolution_samples)} {a.samples}
          </p>
        </section>
      </div>
    </section>
  );
}
