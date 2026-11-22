import { getEvidence } from "@/lib/queries/evidence";
import { getLanguage } from "@/lib/i18n/server";
import type { ReportStatus } from "@/types/reports";
import { EvidenceManager } from "@/components/evidence/evidence-manager";

export async function EvidenceSection({
  reportId,
  role,
  status,
  page,
}: {
  reportId: string;
  role: "admin" | "resident";
  status: ReportStatus;
  page: number;
}) {
  const { t, locale } = await getLanguage();
  const result = await getEvidence(reportId, page);
  if (result.error)
    return (
      <section className="panel evidence-section">
        <h2>{t.evidence.title}</h2>
        <p className="error-banner" role="alert">
          {t.evidence.loadError}
        </p>
      </section>
    );
  return (
    <EvidenceManager
      reportId={reportId}
      kind={role === "admin" ? "resolution" : "report"}
      canUpload={
        role === "admin" || ["pending_review", "in_progress"].includes(status)
      }
      photos={result.photos}
      residentCount={result.residentCount}
      page={result.page}
      pages={result.pages}
      t={t.evidence}
      locale={locale}
    />
  );
}
