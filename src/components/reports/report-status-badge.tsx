import type { ReportStatus } from "@/types/reports";
import type { ReportsDictionary } from "@/lib/i18n/reports";
export function ReportStatusBadge({
  status,
  t,
}: {
  status: ReportStatus;
  t: ReportsDictionary;
}) {
  return (
    <span className={`report-status ${status}`}>
      <span aria-hidden="true" />
      {t.statuses[status]}
    </span>
  );
}
