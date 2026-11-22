import type { ReportStatus } from "../../types/reports.ts";
import { isUuid, parseReportFilters } from "./reports.ts";

export type TargetStatus = "in_progress" | "resolved" | "rejected";
export function allowedTransitions(status: ReportStatus): TargetStatus[] {
  return status === "pending_review"
    ? ["in_progress", "rejected"]
    : status === "in_progress"
      ? ["resolved"]
      : [];
}
export type StatusErrors = Partial<
  Record<"report_id" | "target" | "note" | "version" | "confirmed", boolean>
>;
export function validateStatusChange(input: Record<string, unknown>) {
  const text = (key: string) =>
    typeof input[key] === "string" ? (input[key] as string).trim() : "";
  const values = {
    report_id: text("report_id"),
    target: text("target"),
    note: text("note"),
    version: text("version"),
    confirmed: text("confirmed"),
  };
  const errors: StatusErrors = {};
  if (!isUuid(values.report_id)) errors.report_id = true;
  if (!["in_progress", "resolved", "rejected"].includes(values.target))
    errors.target = true;
  const length = Array.from(values.note).length;
  if (length < 1 || length > 2000) errors.note = true;
  if (
    !/^\d+$/.test(values.version) ||
    !Number.isSafeInteger(Number(values.version))
  )
    errors.version = true;
  if (values.confirmed !== "yes") errors.confirmed = true;
  return { ok: Object.keys(errors).length === 0, values, errors };
}
export function parseAdminFilters(
  params: Record<string, string | string[] | undefined>,
) {
  const base = parseReportFilters(params);
  return {
    ...base,
    zone:
      typeof params.zone === "string"
        ? Array.from(params.zone.trim()).slice(0, 80).join("")
        : "",
    sort: (params.sort === "newest" || params.sort === "oldest"
      ? params.sort
      : "pending") as "newest" | "oldest" | "pending",
  };
}
export type AdminFilters = ReturnType<typeof parseAdminFilters>;
export function adminReportsUrl(filters: AdminFilters) {
  const params = new URLSearchParams();
  for (const field of ["q", "category", "status", "zone", "sort"] as const)
    if (filters[field]) params.set(field, filters[field]);
  params.set("page", String(filters.page));
  return `/admin/reports?${params}`;
}
