import { requireProfile } from "@/lib/auth/session";
import { getLanguage } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { mapText } from "./text";
import { LocationForm } from "./location-form";
export async function ReportLocation({
  reportId,
  admin,
}: {
  reportId: string;
  admin: boolean;
}) {
  await requireProfile(admin ? "admin" : "resident");
  const { locale } = await getLanguage();
  const t = mapText[locale];
  const db = await createClient();
  const [report, location, pin] = await Promise.all([
    db
      .from("reports")
      .select("status,is_public")
      .eq("id", reportId)
      .maybeSingle(),
    db
      .from("report_locations")
      .select("latitude,longitude")
      .eq("report_id", reportId)
      .maybeSingle(),
    admin
      ? db
          .from("community_map_pins")
          .select("latitude,longitude")
          .eq("report_id", reportId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const error = [report, location, pin].find((result) => result.error)?.error;
  if (error || !report.data)
    return (
      <section className="panel operations-panel">
        <h2>{t.privateTitle}</h2>
        <p role="alert">
          {["42P01", "42703", "PGRST205"].includes(error?.code ?? "")
            ? t.migration
            : t.error}
        </p>
      </section>
    );
  return (
    <section className="panel operations-panel">
      <h2>{t.privateTitle}</h2>
      <p>{t.privateHint}</p>
      {admin ||
      ["pending_review", "in_progress"].includes(report.data.status) ? (
        <LocationForm
          reportId={reportId}
          mode="private"
          latitude={location.data ? Number(location.data.latitude) : null}
          longitude={location.data ? Number(location.data.longitude) : null}
          locale={locale}
        />
      ) : (
        <>
          <p>{t.locked}</p>
          {location.data && (
            <p>
              {t.latitude}: {location.data.latitude}, {t.longitude}:{" "}
              {location.data.longitude}
            </p>
          )}
        </>
      )}
      {admin && (
        <>
          <h3>{t.publicTitle}</h3>
          <p>{t.publicHint}</p>
          <LocationForm
            reportId={reportId}
            mode="public"
            latitude={pin.data ? Number(pin.data.latitude) : null}
            longitude={pin.data ? Number(pin.data.longitude) : null}
            locale={locale}
          />
        </>
      )}
    </section>
  );
}
