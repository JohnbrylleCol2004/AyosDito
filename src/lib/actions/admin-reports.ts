"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  validateStatusChange,
  type StatusErrors,
} from "@/lib/validations/status-transitions";

export type StatusFormState = {
  errors?: StatusErrors;
  error?: "stale" | "invalid" | "saveError" | "migrationError";
};
export async function changeReportStatus(
  _previous: StatusFormState,
  form: FormData,
): Promise<StatusFormState> {
  await requireProfile("admin");
  const checked = validateStatusChange(Object.fromEntries(form));
  if (!checked.ok) return { errors: checked.errors };
  const { values } = checked;
  const db = await createClient();
  try {
    const { error } = await db.rpc("transition_report", {
      p_report_id: values.report_id,
      p_new_status: values.target,
      p_note: values.note,
      p_expected_version: Number(values.version),
    });
    if (error)
      return {
        error:
          error.code === "PT409" || error.code === "40001"
            ? "stale"
            : error.code === "22023" || error.code === "P0002"
              ? "invalid"
              : error.code === "PGRST202" || error.code === "42883"
                ? "migrationError"
                : "saveError",
      };
  } catch {
    return { error: "saveError" };
  }
  for (const path of [
    "/admin",
    "/admin/reports",
    `/admin/reports/${values.report_id}`,
    "/dashboard",
    "/reports",
    `/reports/${values.report_id}`,
    "/community",
    `/community/${values.report_id}`,
    "/notifications",
  ])
    revalidatePath(path);
  redirect(`/admin/reports/${values.report_id}?updated=1`);
}
