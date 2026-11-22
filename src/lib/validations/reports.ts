import {
  categories,
  reportStatuses,
  type ReportInput,
  type ReportErrors,
  type ReportFilters,
} from "../../types/reports.ts";

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function validateReport(
  input: Record<string, unknown>,
):
  | { ok: true; values: ReportInput }
  | { ok: false; errors: ReportErrors; values: ReportInput } {
  const text = (key: string) =>
    typeof input[key] === "string" ? (input[key] as string).trim() : "";
  const values: ReportInput = {
    title: text("title"),
    description: text("description"),
    category: text("category"),
    zone: text("zone"),
    location_details: text("location_details"),
    submission_key: text("submission_key"),
  };
  const errors: ReportErrors = {};
  for (const [field, min, max] of [
    ["title", 5, 120],
    ["description", 20, 2000],
    ["zone", 1, 80],
    ["location_details", 0, 200],
  ] as const) {
    const length = Array.from(values[field]).length;
    if (length < min || length > max) errors[field] = true;
  }
  if (!(categories as readonly string[]).includes(values.category))
    errors.category = true;
  if (!isUuid(values.submission_key)) errors.submission_key = true;
  return Object.keys(errors).length
    ? { ok: false, errors, values }
    : { ok: true, values };
}

export function parseReportFilters(
  params: Record<string, string | string[] | undefined>,
): ReportFilters {
  const get = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : "";
  const page = /^\d{1,5}$/.test(get("page")) ? Number(get("page")) : 1;
  return {
    // Search is passed as an RPC parameter and matched literally with SQL strpos.
    q: Array.from(get("q")).slice(0, 120).join("").trim(),
    category: (categories as readonly string[]).includes(get("category"))
      ? (get("category") as ReportFilters["category"])
      : "",
    status: (reportStatuses as readonly string[]).includes(get("status"))
      ? (get("status") as ReportFilters["status"])
      : "",
    sort: get("sort") === "oldest" ? "oldest" : "newest",
    page: page >= 1 && page <= 10000 ? page : 1,
  };
}

export function reportListUrl(filters: ReportFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.status) params.set("status", filters.status);
  params.set("sort", filters.sort);
  params.set("page", String(filters.page));
  return `/reports?${params}`;
}
