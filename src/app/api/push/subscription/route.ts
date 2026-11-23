import { currentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { hasSameOrigin } from "@/lib/evidence/origin";
import { parsePushSubscription } from "@/lib/push/validation";

export async function GET() {
  const profile = await currentProfile();
  if (!profile || profile.approval_status !== "approved")
    return Response.json(
      { endpoints: [] },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  const db = await createClient();
  const result = await db
    .from("push_subscriptions")
    .select("endpoint")
    .eq("user_id", profile.id)
    .limit(10);
  return Response.json(
    { endpoints: result.data?.map((item) => item.endpoint) ?? [] },
    {
      status: result.error ? 503 : 200,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}

export async function POST(request: Request) {
  if (
    !hasSameOrigin(request.headers.get("origin"), request.headers.get("host"))
  )
    return Response.json({ error: "origin" }, { status: 403 });
  const profile = await currentProfile();
  if (!profile || profile.approval_status !== "approved")
    return Response.json({ error: "permission" }, { status: 403 });
  if (Number(request.headers.get("content-length")) > 4096)
    return Response.json({ error: "size" }, { status: 413 });
  let data: unknown;
  try {
    const body = await request.text();
    if (body.length > 4096)
      return Response.json({ error: "size" }, { status: 413 });
    data = JSON.parse(body);
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  const subscription = parsePushSubscription(data);
  if (!subscription)
    return Response.json({ error: "invalid" }, { status: 400 });
  const db = await createClient();
  const { error } = await db.rpc("save_push_subscription", {
    p_endpoint: subscription.endpoint,
    p_p256dh: subscription.keys.p256dh,
    p_auth: subscription.keys.auth,
  });
  return Response.json(
    { ok: !error },
    {
      status: error ? 400 : 200,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
export async function DELETE(request: Request) {
  if (
    !hasSameOrigin(request.headers.get("origin"), request.headers.get("host"))
  )
    return Response.json({ error: "origin" }, { status: 403 });
  const profile = await currentProfile();
  if (!profile) return Response.json({ error: "permission" }, { status: 401 });
  let endpoint: unknown;
  try {
    const body = await request.text();
    if (body.length > 4096) throw new Error("size");
    endpoint = (JSON.parse(body) as { endpoint?: unknown }).endpoint;
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  if (typeof endpoint !== "string" || !endpoint || endpoint.length > 2048)
    return Response.json({ error: "invalid" }, { status: 400 });
  const db = await createClient();
  const result = await db.rpc("remove_push_subscription", {
    p_endpoint: endpoint,
  });
  return Response.json(
    { ok: !result.error },
    {
      status: result.error ? 400 : 200,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
