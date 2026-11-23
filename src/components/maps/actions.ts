"use server";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { parseCoordinates } from "./coordinates";
export type LocationState = {
  error?: "invalid" | "migration" | "saveError";
  saved?: boolean;
};
export async function saveLocation(
  _previous: LocationState,
  form: FormData,
): Promise<LocationState> {
  const mode = form.get("mode");
  if (mode !== "private" && mode !== "public") return { error: "invalid" };
  await requireProfile(mode === "public" ? "admin" : undefined);
  const id = String(form.get("report_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "invalid" };
  const coordinates =
    form.get("intent") === "remove"
      ? { latitude: null, longitude: null }
      : parseCoordinates(
          String(form.get("latitude") ?? ""),
          String(form.get("longitude") ?? ""),
        );
  if (!coordinates) return { error: "invalid" };
  const db = await createClient();
  const { error } = await db.rpc(
    mode === "public" ? "set_public_map_pin" : "save_report_location",
    {
      p_report_id: id,
      p_latitude: coordinates.latitude,
      p_longitude: coordinates.longitude,
    },
  );
  if (error)
    return {
      error: ["42883", "42P01", "PGRST202", "PGRST205"].includes(error.code)
        ? "migration"
        : "saveError",
    };
  for (const path of [
    `/reports/${id}`,
    `/admin/reports/${id}`,
    "/community/map",
  ])
    revalidatePath(path);
  return { saved: true };
}
