import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Workflow = {
  assignee_id: string | null;
  responsible_office: string | null;
  target_date: string | null;
  duplicate_of: string | null;
  version: number;
};
export type ReopenRequest = {
  id: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
  created_at: string;
};
export function operationsError(code?: string): "migration" | "load" {
  return ["42P01", "42883", "42703", "PGRST202", "PGRST205"].includes(
    code ?? "",
  )
    ? "migration"
    : "load";
}
export async function getOperations(reportId: string, admin: boolean) {
  const db = await createClient();
  const [report, feedback, requests, workflow, notes, admins, duplicates] =
    await Promise.all([
      db.from("reports").select("status").eq("id", reportId).maybeSingle(),
      db
        .from("report_feedback")
        .select("rating,comment")
        .eq("report_id", reportId)
        .maybeSingle(),
      db
        .from("report_reopen_requests")
        .select("id,reason,status,review_note,created_at")
        .eq("report_id", reportId)
        .order("created_at", { ascending: false })
        .limit(20),
      admin
        ? db
            .from("report_workflows")
            .select(
              "assignee_id,responsible_office,target_date,duplicate_of,version",
            )
            .eq("report_id", reportId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      admin
        ? db
            .from("report_internal_notes")
            .select("id,note,created_at")
            .eq("report_id", reportId)
            .order("created_at", { ascending: false })
            .limit(30)
        : Promise.resolve({ data: [], error: null }),
      admin
        ? db
            .from("profiles")
            .select("id,full_name")
            .eq("role", "admin")
            .order("full_name")
        : Promise.resolve({ data: [], error: null }),
      admin
        ? db
            .from("reports")
            .select("id,tracking_no,title")
            .neq("id", reportId)
            .order("created_at", { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [], error: null }),
    ]);
  const error = [
    report,
    feedback,
    requests,
    workflow,
    notes,
    admins,
    duplicates,
  ].find((r) => r.error)?.error;
  return {
    error: error ? operationsError(error.code) : null,
    status: report.data?.status as string | undefined,
    feedback: feedback.data as {
      rating: number;
      comment: string | null;
    } | null,
    requests: (requests.data ?? []) as ReopenRequest[],
    workflow: workflow.data as Workflow | null,
    notes: (notes.data ?? []) as {
      id: string;
      note: string;
      created_at: string;
    }[],
    admins: (admins.data ?? []) as { id: string; full_name: string }[],
    duplicates: (duplicates.data ?? []) as {
      id: string;
      tracking_no: string;
      title: string;
    }[],
  };
}
export async function getOperationsSummary() {
  const db = await createClient();
  const { data, error } = await db.rpc("admin_operations_summary");
  return {
    summary: data as {
      unassigned: number;
      overdue: number;
      due_today: number;
      reopen_pending: number;
    } | null,
    error: error ? operationsError(error.code) : null,
  };
}
