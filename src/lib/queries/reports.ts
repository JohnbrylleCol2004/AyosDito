import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth/session";
import {
  PAGE_SIZE,
  type Report,
  type ReportUpdate,
  type ReportFilters,
} from "@/types/reports";

export type ReportSummary = Omit<Report, "location_details" | "updated_at">;
const summaryColumns =
  "id,tracking_no,title,description,category,zone,status,created_at";

export async function getResidentReports(
  profile: Profile,
  filters: ReportFilters,
) {
  const db = await createClient();
  const query = (head: boolean) => {
    let builder = db
      .rpc(
        "search_my_reports",
        { p_search: filters.q },
        { count: "exact", head },
      )
      .select(summaryColumns)
      .eq("reporter_id", profile.id);
    if (filters.category) builder = builder.eq("category", filters.category);
    if (filters.status) builder = builder.eq("status", filters.status);
    return builder;
  };
  const countResult = await query(true);
  if (countResult.error)
    return {
      reports: [] as ReportSummary[],
      total: 0,
      pages: 1,
      page: 1,
      error: true,
    };
  const total = countResult.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  const { data, error } = await query(false)
    .order("created_at", { ascending: filters.sort === "oldest" })
    .order("id", { ascending: filters.sort === "oldest" })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  return {
    reports: (data ?? []) as ReportSummary[],
    total,
    pages,
    page,
    error: !!error,
  };
}

export async function getRecentReports(profile: Profile) {
  const db = await createClient();
  let query = db
    .from("reports")
    .select(summaryColumns)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(5);
  if (profile.role === "resident") query = query.eq("reporter_id", profile.id);
  const { data, error } = await query;
  return { reports: (data ?? []) as ReportSummary[], error: !!error };
}

export async function getReport(profile: Profile, id: string) {
  const db = await createClient();
  let query = db
    .from("reports")
    .select(`${summaryColumns},location_details,updated_at`)
    .eq("id", id);
  if (profile.role !== "admin") query = query.eq("reporter_id", profile.id);
  const { data, error } = await query.maybeSingle();
  return { report: data as Report | null, error: !!error };
}

export async function getReportHistory(id: string, requestedPage: number) {
  const db = await createClient();
  const count = await db
    .from("report_updates")
    .select("id", { count: "exact", head: true })
    .eq("report_id", id);
  if (count.error)
    return {
      updates: [] as ReportUpdate[],
      pages: 1,
      page: 1,
      error: true,
      total: 0,
    };
  const total = count.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / 25));
  const page = Math.min(requestedPage, pages);
  const { data, error } = await db
    .from("report_updates")
    .select("id,old_status,new_status,note,created_at")
    .eq("report_id", id)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range((page - 1) * 25, page * 25 - 1);
  return {
    updates: (data ?? []) as ReportUpdate[],
    pages,
    page,
    total,
    error: !!error,
  };
}
