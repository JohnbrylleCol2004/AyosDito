import { requireProfile } from "@/lib/auth/session";
import { getLanguage } from "@/lib/i18n/server";
import { AppShell } from "@/components/app-shell";
export default async function ExportsPage() {
  const profile = await requireProfile("admin");
  const { locale } = await getLanguage();
  const fil = locale === "fil";
  const month = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    timeZone: "Asia/Manila",
  }).format(new Date());
  return (
    <AppShell profile={profile} section="exports">
      <div className="page-heading">
        <h1>{fil ? "Buwanang pag-export" : "Monthly exports"}</h1>
        <p>
          {fil
            ? "Piliin ang buwan ng pagtanggap ng mga ulat. Nakabatay ang mga petsa sa oras ng Maynila."
            : "Choose the month reports were received. Date boundaries follow Manila time."}
        </p>
      </div>
      <section className="panel operations-panel">
        <h2>{fil ? "I-download ang tala" : "Download records"}</h2>
        <p>
          {fil
            ? "CSV: hanggang 5,000 ulat, kasama ang pribadong pamagat at pook. PDF: buod ng bilang ayon sa katayuan at kategorya."
            : "CSV: up to 5,000 reports, including private titles and zones. PDF: counts by status and category."}
        </p>
        <p>
          {fil
            ? "Para lamang sa awtorisadong gamit. Ang mga katayuan ay batay sa oras ng pag-export."
            : "For authorized use only. Statuses reflect the time of export."}
        </p>
        <form
          action="/api/admin/exports"
          method="get"
          className="engagement-form"
        >
          <input type="hidden" name="locale" value={locale} />
          <div className="field">
            <label htmlFor="export-month">{fil ? "Buwan" : "Month"}</label>
            <input
              id="export-month"
              name="month"
              type="month"
              min="2000-01"
              max="2199-12"
              required
              defaultValue={month}
            />
          </div>
          <div className="engagement-actions">
            <button className="button primary" name="format" value="csv">
              {fil ? "I-download ang CSV" : "Download CSV"}
            </button>
            <button className="button" name="format" value="pdf">
              {fil ? "I-download ang PDF" : "Download PDF"}
            </button>
          </div>
        </form>
      </section>
    </AppShell>
  );
}
