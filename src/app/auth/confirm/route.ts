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
  const token_hash = url.searchParams.get("token_hash"),
    type = url.searchParams.get("type");
  if (
    token_hash &&
    (type === "email" || type === "signup" || type === "recovery")
  ) {
    const client = await createClient();
    const { error } = await client.auth.verifyOtp({ token_hash, type });
    if (!error)
      redirect(
        `${origin}${type === "recovery" ? "/auth/reset-password" : safeAuthNext(url.searchParams.get("next"))}`,
      );
  }
  redirect(`${origin}/auth/link-error`);
}
