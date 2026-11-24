import type { Session, SupabaseClient } from "@supabase/supabase-js";

// Keep the PKCE verifier until email confirmation exchanges its code. Signing out
// clears that verifier, so only end an automatically created signup session.
export async function finishRegistration(
  auth: Pick<SupabaseClient["auth"], "signOut">,
  session: Session | null,
) {
  if (session) await auth.signOut({ scope: "local" });
}
