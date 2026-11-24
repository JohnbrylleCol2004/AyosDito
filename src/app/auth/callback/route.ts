import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canonicalSiteUrl, safeAuthNext } from "@/lib/auth/accounts";
import { supabaseConfig } from "@/lib/supabase/config";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = canonicalSiteUrl();
  if (!origin || !supabaseConfig())
    return new Response(
      "Account email setup requires SITE_URL and Supabase configuration.",
      { status: 503 },
    );
  const code = url.searchParams.get("code");
  const flowId = url.searchParams.get("flow_id");
  if (flowId && !/^[A-Za-z0-9_-]{8,64}$/.test(flowId))
    redirect(`${origin}/auth/link-error`);
  if (code) {
    const client = await createClient();
    const { error } = await client.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );
    if (!error)
      redirect(`${origin}${safeAuthNext(url.searchParams.get("next"))}`);
  }
  redirect(`${origin}/auth/link-error`);
}
