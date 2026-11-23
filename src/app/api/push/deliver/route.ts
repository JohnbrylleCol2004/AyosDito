import { timingSafeEqual } from "node:crypto";
import * as webpush from "web-push";
import { evidenceService } from "@/lib/evidence/storage";
import { parsePushSubscription } from "@/lib/push/validation";
export const runtime = "nodejs";
export const maxDuration = 60;
type Delivery = {
  id: string;
  lease: string;
  subscription_id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
};
async function deliver(request: Request) {
  const secret = process.env.PUSH_CRON_SECRET;
  const received = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (
    !secret ||
    Buffer.byteLength(received) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(received), Buffer.from(expected))
  )
    return Response.json({ error: "unauthorized" }, { status: 401 });
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    privateKey = process.env.VAPID_PRIVATE_KEY,
    subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject)
    return Response.json({ error: "push_not_configured" }, { status: 503 });
  const db = evidenceService();
  const batch = await db.rpc("claim_push_deliveries", { p_limit: 10 });
  if (batch.error)
    return Response.json({ error: "queue_unavailable" }, { status: 503 });
  const results = await Promise.all(
    (batch.data as Delivery[]).map(async (item) => {
      let success = false,
        expired = false;
      try {
        const sub = parsePushSubscription(item);
        if (!sub) expired = true;
        else {
          await webpush.sendNotification(
            sub,
            JSON.stringify({
              subscriptionId: item.subscription_id,
              tag: item.id,
            }),
            {
              vapidDetails: { subject, publicKey, privateKey },
              TTL: 3600,
              timeout: 10000,
            },
          );
          success = true;
        }
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        expired = status === 404 || status === 410;
      }
      const completed = await db.rpc("complete_push_delivery", {
        p_id: item.id,
        p_lease: item.lease,
        p_success: success,
        p_expired: expired,
      });
      return success && !completed.error;
    }),
  );
  return Response.json(
    { processed: results.length, sent: results.filter(Boolean).length },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
export { deliver as POST, deliver as GET };
