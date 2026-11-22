import { randomUUID } from "node:crypto";
import { requireProfile } from "@/lib/auth/session";
import { getLanguage } from "@/lib/i18n/server";
import { AppShell } from "@/components/app-shell";
import { ReportForm } from "@/components/reports/report-form";

export default async function NewReportPage() {
  const profile = await requireProfile("resident");
  const { t } = await getLanguage();
  return (
    <AppShell profile={profile} section="new">
      <div className="page-heading">
        <div className="eyebrow">{t.reports.phase}</div>
        <h1>{t.reports.formTitle}</h1>
        <p>{t.reports.formIntro}</p>
      </div>
      <ReportForm
        t={t.reports}
        evidenceT={t.evidence}
        submissionKey={randomUUID()}
        zone={profile.zone ?? ""}
      />
    </AppShell>
  );
}
