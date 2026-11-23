"use server";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
export type OperationsState = {
  error?: "migration" | "conflict" | "invalid" | "save";
  saved?: boolean;
};
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function saveOperations(
  _previous: OperationsState,
  form: FormData,
): Promise<OperationsState> {
  const kind = String(form.get("kind") ?? "");
  if (!["workflow", "note", "feedback", "reopen", "review"].includes(kind))
    return { error: "invalid" };
  const admin = ["workflow", "note", "review"].includes(kind);
  await requireProfile(admin ? "admin" : "resident");
  const id = String(form.get("report_id") ?? "");
  if (!uuid.test(id)) return { error: "invalid" };
  const value = (name: string) => String(form.get(name) ?? "").trim();
  const version = value("version");
  if (
    ["workflow", "review"].includes(kind) &&
    (!/^\d+$/.test(version) || !Number.isSafeInteger(Number(version)))
  )
    return { error: "invalid" };
  let rpc: string;
  let args: Record<string, unknown>;
  switch (kind) {
    case "workflow": {
      const assignee = value("assignee_id"),
        duplicate = value("duplicate_of"),
        date = value("target_date");
      if (
        (assignee && !uuid.test(assignee)) ||
        (duplicate && !uuid.test(duplicate)) ||
        (date && !/^\d{4}-\d{2}-\d{2}$/.test(date))
      )
        return { error: "invalid" };
      rpc = "set_report_workflow";
      args = {
        p_report_id: id,
        p_assignee_id: assignee || null,
        p_responsible_office: value("responsible_office") || null,
        p_target_date: date || null,
        p_duplicate_of: duplicate || null,
        p_expected_version: Number(version),
      };
      break;
    }
    case "note":
      rpc = "add_report_internal_note";
      args = { p_report_id: id, p_note: value("note") };
      break;
    case "feedback":
      rpc = "save_report_feedback";
      args = {
        p_report_id: id,
        p_rating: Number(value("rating")),
        p_comment: value("comment") || null,
      };
      break;
    case "reopen":
      rpc = "request_report_reopen";
      args = { p_report_id: id, p_reason: value("reason") };
      break;
    default:
      if (
        !uuid.test(value("request_id")) ||
        !["true", "false"].includes(value("approve"))
      )
        return { error: "invalid" };
      rpc = "review_report_reopen";
      args = {
        p_request_id: value("request_id"),
        p_approve: value("approve") === "true",
        p_note: value("note"),
        p_expected_version: Number(version),
      };
  }
  const db = await createClient();
  try {
    const { error } = await db.rpc(rpc, args);
    if (error)
      return {
        error: ["PGRST202", "PGRST205", "42883", "42P01", "42703"].includes(
          error.code,
        )
          ? "migration"
          : error.code === "PT409"
            ? "conflict"
            : error.code === "22023"
              ? "invalid"
              : "save",
      };
  } catch {
    return { error: "save" };
  }
  for (const path of [
    "/admin",
    "/dashboard",
    "/community",
    "/notifications",
    `/reports/${id}`,
    `/admin/reports/${id}`,
    `/community/${id}`,
  ])
    revalidatePath(path);
  return { saved: true };
}
