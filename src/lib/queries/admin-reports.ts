import "server-only";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  PAGE_SIZE,
  type Report,
  type Category,
  type ReportStatus,
} from "@/types/reports";
import type { AdminFilters } from "@/lib/validations/status-transitions";

export type AdminReport = Report & {
  status_version: number;
  reporter_id: string;
  reporter: { full_name: string; zone: string | null } | null;
};
export type AdminStats = Record<ReportStatus | "total", number> & {
  categories: Partial<Record<Category, number>>;
};
const columns =
  "id,tracking_no,title,description,category,zone,location_details,status,created_at,updated_at,status_version,reporter_id,reporter:profiles!reports_reporter_id_fkey(full_name,zone)";

export async function getAdminReports(filters: AdminFilters) {
  await requireProfile("admin");
  const db = await createClient();
  const query = (head: boolean) => {
    let q = db
      .rpc(
        "search_admin_reports",
        { p_search: filters.q },
        { head, count: "exact" },
      )
      .select(columns);
    if (filters.category) q = q.eq("category", filters.category);
    if (filters.status) q = q.eq("status", filters.status);
    if (filters.zone) q = q.eq("zone", filters.zone);
    return q;
  };
  const counted = await query(true);
  if (counted.error)
    return {
      reports: [] as AdminReport[],
      error: true,
      total: 0,
      page: 1,
      pages: 1,
    };
  const total = counted.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  let ordered = query(false);
  if (filters.sort === "pending")
    ordered = ordered.order("status", { ascending: true });
  const ascending = filters.sort !== "newest";
  const { data, error } = await ordered
    .order("created_at", { ascending })
    .order("id", { ascending })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  return {
    reports: (data ?? []) as unknown as AdminReport[],
    total,
    pages,
    page,
    error: !!error,
  };
}

export async function getAdminReport(id: string) {
  await requireProfile("admin");
  const db = await createClient();
  const { data, error } = await db
    .from("reports")
    .select(columns)
    .eq("id", id)
    .maybeSingle();
  return { report: data as unknown as AdminReport | null, error: !!error };
}

export async function getAdminDashboard() {
  await requireProfile("admin");
  const db = await createClient();
  const [stats, recent, pending, updated] = await Promise.all([
    db.rpc("admin_report_stats"),
    db
      .from("reports")
      .select(columns)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(5),
    db
      .from("reports")
      .select(columns)
      .eq("status", "pending_review")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(5),
    db
      .from("reports")
      .select(columns)
      .neq("status", "pending_review")
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(5),
  ]);
  return {
    stats: stats.error ? null : (stats.data as AdminStats),
    recent,
    pending,
    updated,
  };
}
