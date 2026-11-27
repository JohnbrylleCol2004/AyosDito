import "server-only";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { requireProfile } from "@/lib/auth/session";
import type { Category } from "@/types/reports";

export type PublicIssue = {
  id: string;
  public_title: string;
  public_summary: string;
  public_zone: string;
  category: Category;
  status: "in_progress" | "resolved";
  confirmation_count: number;
  viewer_confirmed: boolean;
  total_count: number;
};
export type CommunityFilters = {
  q: string;
  category: string;
  zone: string;
  status: string;
  sort: string;
  page: number;
};
export function communityUrl(filters: CommunityFilters) {
  return `/community?${new URLSearchParams({ q: filters.q, category: filters.category, zone: filters.zone, status: filters.status, sort: filters.sort, page: String(filters.page) })}`;
}
export async function getCommunity(filters: CommunityFilters, id?: string) {
  if (!supabaseConfig()) return { issues: [] as PublicIssue[], error: true };
  const db = await createClient();
  const { data, error } = await db.rpc("community_reports", {
    p_search: filters.q,
    p_category: filters.category,
    p_zone: filters.zone,
    p_status: filters.status,
    p_sort: filters.sort,
    p_page: filters.page,
    p_id: id ?? null,
  });
  return { issues: (data ?? []) as PublicIssue[], error: !!error };
}
export type InboxNotification = {
  id: string;
  report_id: string;
  title_key: "status_update";
  message_key: "in_progress" | "resolved" | "rejected";
  is_read: boolean;
  created_at: string;
};
export async function getNotifications(page = 1, limit = 12) {
  await requireProfile();
  const db = await createClient();
  const [counted, unread] = await Promise.all([
    db.from("notifications").select("id", { count: "exact", head: true }),
    db
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false),
  ]);
  const total = counted.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  const actualPage = Math.min(Math.max(1, page), pages);
  if (counted.error || unread.error)
    return {
      notifications: [] as InboxNotification[],
      unread: 0,
      total: 0,
      page: 1,
      error: true,
    };
  const inbox = await db
    .from("notifications")
    .select("id,report_id,title_key,message_key,is_read,created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((actualPage - 1) * limit, actualPage * limit - 1);
  return {
    notifications: (inbox.data ?? []) as InboxNotification[],
    unread: unread.count ?? 0,
    total,
    page: actualPage,
    error: !!inbox.error,
  };
}
