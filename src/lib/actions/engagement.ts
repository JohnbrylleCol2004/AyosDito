"use server";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type EngagementState = { error?: boolean; saved?: boolean };
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function savePublication(
  _state: EngagementState,
  form: FormData,
): Promise<EngagementState> {
  await requireProfile("admin");
  const id = String(form.get("report_id") ?? "");
  const choice = form.get("published");
  if (!uuid.test(id) || !["true", "false"].includes(String(choice)))
    return { error: true };
  const db = await createClient();
  const { error } = await db.rpc("set_report_publication", {
    p_report_id: id,
    p_published: choice === "true",
    p_title: String(form.get("public_title") ?? "").trim(),
    p_summary: String(form.get("public_summary") ?? "").trim(),
    p_zone: String(form.get("public_zone") ?? "").trim(),
    p_confirmed_safe: form.get("safe") === "yes",
  });
  if (error) return { error: true };
  revalidatePath("/community");
  revalidatePath(`/community/${id}`);
  revalidatePath(`/admin/reports/${id}`);
  return { saved: true };
}
export async function saveConfirmation(
  _state: EngagementState,
  form: FormData,
): Promise<EngagementState> {
  await requireProfile("resident");
  const id = String(form.get("report_id") ?? "");
  const choice = form.get("confirmed");
  if (!uuid.test(id) || !["true", "false"].includes(String(choice)))
    return { error: true };
  const db = await createClient();
  const { error } = await db.rpc("set_report_confirmation", {
    p_report_id: id,
    p_confirmed: choice === "true",
  });
  if (error) return { error: true };
  revalidatePath("/community");
  revalidatePath(`/community/${id}`);
  return { saved: true };
}
export async function markRead(
  _state: EngagementState,
  form: FormData,
): Promise<EngagementState> {
  await requireProfile();
  const id = String(form.get("notification_id") ?? "");
  if (id && !uuid.test(id)) return { error: true };
  const db = await createClient();
  const { error } = await db.rpc("mark_notifications_read", {
    p_id: id || null,
  });
  if (error) return { error: true };
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { saved: true };
}
