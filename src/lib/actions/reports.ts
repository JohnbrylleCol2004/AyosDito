"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { validateReport } from "@/lib/validations/reports";
import type { ReportErrors, ReportInput } from "@/types/reports";
import { prepareEvidence } from "@/lib/evidence/image";
import {
  evidenceService,
  uploadPreparedEvidence,
} from "@/lib/evidence/storage";

export type ReportFormState = {
  errors?: ReportErrors;
  values?: ReportInput;
  reportId?: string;
  error?: "saveError" | "migrationError" | "duplicateError" | "photoError";
};

export async function submitReport(
  _previous: ReportFormState,
  form: FormData,
): Promise<ReportFormState> {
  const profile = await requireProfile("resident");
  const result = validateReport(Object.fromEntries(form));
  if (!result.ok) return { errors: result.errors, values: result.values };
  const values = result.values;
  const files = form.getAll("photos");
  const images = [];
  if (files.length) {
    try {
      if (files.length > 3 || files.some((file) => !(file instanceof File)))
        return { values, error: "photoError" };
      evidenceService();
      for (const file of files)
        images.push(await prepareEvidence(file as File));
    } catch {
      return { values, error: "photoError" };
    }
  }
  const supabase = await createClient();
  let id: string;
  try {
    const { data, error } = await supabase.rpc("create_report", {
      p_title: values.title,
      p_description: values.description,
      p_category: values.category,
      p_zone: values.zone,
      p_location_details: values.location_details || null,
      p_submission_key: values.submission_key,
    });
    if (error || typeof data !== "string") {
      const code = error?.code;
      return {
        values,
        error:
          code === "PGRST202" || code === "42883"
            ? "migrationError"
            : code === "22023"
              ? "duplicateError"
              : "saveError",
      };
    }
    id = data;
  } catch {
    return { values, error: "saveError" };
  }
  if (images.length) {
    try {
      await uploadPreparedEvidence(
        supabase,
        profile,
        id,
        "report",
        values.submission_key,
        images,
      );
    } catch {
      return { values, reportId: id, error: "photoError" };
    }
  }
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/admin");
  redirect(`/reports/${id}?submitted=1`);
}
