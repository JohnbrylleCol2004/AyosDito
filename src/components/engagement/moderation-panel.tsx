import { requireProfile } from "@/lib/auth/session";
import { getLanguage } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import type { ReportStatus } from "@/types/reports";
import { ModerationForm, type PublicFields } from "./moderation-form";
export async function ModerationPanel({
  reportId,
  status,
}: {
  reportId: string;
  status: ReportStatus;
}) {
  await requireProfile("admin");
  const { t } = await getLanguage();
  const e = t.engagement;
  const db = await createClient();
  const { data, error } = await db
    .from("reports")
    .select("is_public,public_title,public_summary,public_zone")
    .eq("id", reportId)
    .maybeSingle();
  return (
    <section className="panel engagement-panel">
      <h2>{e.moderation}</h2>
      <p>{e.moderationHint}</p>
      {error || !data ? (
        <p role="alert">{e.loadError}</p>
      ) : !["in_progress", "resolved"].includes(status) ? (
        <p>{e.unavailable}</p>
      ) : (
        <ModerationForm
          reportId={reportId}
          fields={data as PublicFields}
          t={e}
        />
      )}
    </section>
  );
}
