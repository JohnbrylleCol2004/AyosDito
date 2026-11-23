import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validations/reports";
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("subscription");
  if (!id || !isUuid(id))
    return Response.json(
      { authorized: false },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  const db = await createClient();
  const { data, error } = await db.rpc("owns_push_subscription", { p_id: id });
  return Response.json(
    { authorized: !error && data === true },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
