import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { currentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validations/reports";
import { EvidenceError, prepareEvidence } from "@/lib/evidence/image";
import { uploadPreparedEvidence } from "@/lib/evidence/storage";
import { hasSameOrigin } from "@/lib/evidence/origin";

export const runtime = "nodejs";
export const maxDuration = 60;

async function boundedForm(request: Request) {
  const max = 16 * 1024 * 1024;
  if (Number(request.headers.get("content-length")) > max)
    throw new EvidenceError("fileSize");
  const reader = request.body?.getReader();
  if (!reader) throw new EvidenceError("fileCount");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > max) {
        await reader.cancel();
        throw new EvidenceError("fileSize");
      }
      chunks.push(next.value);
    }
    return await new Response(new Uint8Array(Buffer.concat(chunks)), {
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    }).formData();
  } catch (error) {
    if (error instanceof EvidenceError) throw error;
    throw new EvidenceError("fileContent");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (
    !hasSameOrigin(request.headers.get("origin"), request.headers.get("host"))
  )
    return Response.json({ error: "csrf" }, { status: 403 });
  const profile = await currentProfile();
  if (!profile) return Response.json({ error: "permission" }, { status: 401 });
  if (profile.approval_status !== "approved")
    return Response.json({ error: "permission" }, { status: 403 });
  const { id } = await params;
  if (!isUuid(id))
    return Response.json({ error: "permission" }, { status: 404 });
  try {
    const db = await createClient();
    const authorized = await db
      .from("reports")
      .select("id,status,reporter_id")
      .eq("id", id)
      .maybeSingle();
    if (
      authorized.error ||
      !authorized.data ||
      (profile.role === "resident" &&
        authorized.data.reporter_id !== profile.id)
    )
      throw new EvidenceError("permission");
    if (
      profile.role === "resident" &&
      !["pending_review", "in_progress"].includes(authorized.data.status)
    )
      throw new EvidenceError("closed");
    const form = await boundedForm(request);
    const kind = form.get("photo_type");
    if (kind !== "report" && kind !== "resolution")
      throw new EvidenceError("permission");
    if (
      (profile.role === "resident" && kind !== "report") ||
      (profile.role === "admin" && kind !== "resolution")
    )
      throw new EvidenceError("permission");
    const files = form.getAll("photos");
    if (
      !files.length ||
      files.length > 3 ||
      files.some((file) => !(file instanceof File))
    )
      throw new EvidenceError("fileCount");
    const images = [];
    for (const file of files) images.push(await prepareEvidence(file as File));
    const batch = form.get("request_key") ?? randomUUID();
    if (typeof batch !== "string" || !isUuid(batch))
      throw new EvidenceError("expired");
    await uploadPreparedEvidence(db, profile, id, kind, batch, images);
    for (const path of [`/reports/${id}`, `/admin/reports/${id}`])
      revalidatePath(path);
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof EvidenceError ? error.code : "uploadFailed" },
      {
        status:
          error instanceof EvidenceError && error.code === "permission"
            ? 403
            : 400,
      },
    );
  }
}
