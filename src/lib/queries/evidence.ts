import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/session";

export async function getEvidence(reportId: string, requestedPage: number) {
  await requireProfile();
  const db = await createClient();
  const [count, residentCount] = await Promise.all([
    db
      .from("report_photos")
      .select("id", { count: "exact", head: true })
      .eq("report_id", reportId)
      .eq("upload_state", "ready"),
    db
      .from("report_photos")
      .select("id", { count: "exact", head: true })
      .eq("report_id", reportId)
      .eq("photo_type", "report")
      .eq("upload_state", "ready"),
  ]);
  const pages = Math.max(1, Math.ceil((count.count ?? 0) / 12));
  const page = Math.min(requestedPage, pages);
  const { data, error } = await db
    .from("report_photos")
    .select("id,storage_path,photo_type,created_at")
    .eq("report_id", reportId)
    .eq("upload_state", "ready")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range((page - 1) * 12, page * 12 - 1);
  const photos = await Promise.all(
    (data ?? []).map(async (photo) => {
      const signed = await db.storage
        .from("report-photos")
        .createSignedUrl(photo.storage_path, 120);
      return {
        id: photo.id as string,
        photo_type: photo.photo_type as "report" | "resolution",
        created_at: photo.created_at as string,
        url: signed.error ? null : signed.data.signedUrl,
      };
    }),
  );
  return {
    photos,
    residentCount: residentCount.count ?? 0,
    page,
    pages,
    error: !!error || !!count.error || !!residentCount.error,
  };
}
