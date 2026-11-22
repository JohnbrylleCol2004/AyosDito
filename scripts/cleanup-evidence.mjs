// Trusted maintenance only. Removes interrupted uploads after a 20-minute grace period.
import { createClient } from "@supabase/supabase-js";
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY)
  throw new Error(
    "Configure the Supabase URL and server secret in .env.local.",
  );
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const cutoff = new Date(Date.now() - 20 * 60 * 1000).toISOString();
// First cancel expired pending rows. A later run performs deletion after cancellation grace.
const pending = await db
  .from("report_photos")
  .select("id,uploaded_by")
  .eq("upload_state", "pending")
  .lt("upload_expires_at", new Date().toISOString())
  .limit(100);
if (pending.error)
  throw new Error("Could not load expired evidence reservations.");
for (const item of pending.data)
  await db.rpc("cancel_evidence", {
    p_photo_id: item.id,
    p_actor: item.uploaded_by,
  });
const result = await db
  .from("report_photos")
  .select("id,uploaded_by,storage_path,report_id,cancelled_at")
  .eq("upload_state", "cancelled")
  .lt("cancelled_at", cutoff)
  .order("cancelled_at")
  .limit(100);
if (result.error)
  throw new Error("Could not load cancelled evidence reservations.");
let cleaned = 0;
for (const item of result.data) {
  if (item.storage_path !== `${item.report_id}/${item.id}.webp`) continue;
  const removed = await db.storage
    .from("report-photos")
    .remove([item.storage_path]);
  if (removed.error) continue;
  const deleted = await db
    .from("report_photos")
    .delete()
    .eq("id", item.id)
    .eq("upload_state", "cancelled")
    .eq("cancelled_at", item.cancelled_at);
  if (!deleted.error) cleaned++;
}
console.log(
  `Cleaned ${cleaned} interrupted evidence reservations. Ready evidence was not selected.`,
);
