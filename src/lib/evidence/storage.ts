import "server-only";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import type { Profile } from "@/lib/auth/session";
import { supabaseConfig } from "@/lib/supabase/config";
import { isUuid } from "@/lib/validations/reports";
import {
  EvidenceError,
  evidenceRequestKey,
  type PreparedEvidence,
} from "./image";

export function evidenceService() {
  const config = supabaseConfig();
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!config || !key) throw new EvidenceError("config");
  // Used only by validated upload/compensation code, never normal report reads/mutations.
  return createSupabaseClient(config.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (url, options) =>
        fetch(url, {
          ...options,
          signal: options?.signal ?? AbortSignal.timeout(30_000),
        }),
    },
  });
}

export async function uploadPreparedEvidence(
  db: SupabaseClient,
  profile: Profile,
  reportId: string,
  kind: "report" | "resolution",
  batch: string,
  images: PreparedEvidence[],
) {
  if (
    !isUuid(reportId) ||
    !isUuid(batch) ||
    !images.length ||
    images.length > 3
  )
    throw new EvidenceError("fileCount");
  const service = evidenceService();
  for (const [index, image] of images.entries()) {
    const { data, error } = await db.rpc("reserve_evidence", {
      p_report_id: reportId,
      p_photo_type: kind,
      p_request_key: evidenceRequestKey(batch, index, image.digest),
    });
    if (error || !data)
      throw new EvidenceError(
        error?.code === "42501"
          ? "permission"
          : error?.code === "23514"
            ? "limit"
            : error?.code === "PT409"
              ? "expired"
              : "uploadFailed",
      );
    const item = data as { id: string; path: string; state: string };
    if (!isUuid(item.id) || item.path !== `${reportId}/${item.id}.webp`)
      throw new EvidenceError("server");
    if (item.state === "ready") continue;
    try {
      const uploaded = await service.storage
        .from("report-photos")
        .upload(item.path, image.bytes, {
          contentType: "image/webp",
          cacheControl: "0",
          upsert: false,
        });
      if (
        uploaded.error &&
        Number((uploaded.error as { statusCode?: string }).statusCode) !== 409
      )
        throw new EvidenceError("storage");
      const completed = await service.rpc("finalize_evidence", {
        p_photo_id: item.id,
        p_actor: profile.id,
      });
      if (completed.error || completed.data !== true)
        throw new EvidenceError(
          completed.error?.code === "42501" ? "closed" : "uploadFailed",
        );
    } catch (error) {
      // Row locking decides whether finalization committed despite a lost response.
      // Never delete a ready file. Ambiguous failures retain a private reservation for cleanup.
      const cancelled = await service.rpc("cancel_evidence", {
        p_photo_id: item.id,
        p_actor: profile.id,
      });
      if (!cancelled.error && cancelled.data === "ready") continue;
      if (!cancelled.error && cancelled.data === "cancelled")
        await service.storage.from("report-photos").remove([item.path]);
      // Cancelled rows are retained until the cleanup grace period, so late Storage responses
      // cannot leave untracked objects. Their files are not eligible for signed access.
      throw error instanceof EvidenceError
        ? error
        : new EvidenceError("uploadFailed");
    }
  }
}
