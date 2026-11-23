"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import {
  canonicalSiteUrl,
  parseMemberReview,
  parseRegistration,
  validPassword,
} from "./accounts";
import { parseCredentials } from "./rules";
import { requireProfile } from "./session";
export type AccountState = {
  error?:
    | "email"
    | "password"
    | "confirm"
    | "name"
    | "zone"
    | "error"
    | "setup"
    | "invalid";
  success?: boolean;
};
export async function registerResident(
  _: AccountState,
  form: FormData,
): Promise<AccountState> {
  const parsed = parseRegistration(form);
  if (!parsed.ok) return { error: parsed.field };
  const origin = canonicalSiteUrl();
  if (!origin || !supabaseConfig()) return { error: "setup" };
  try {
    const supabase = await createClient();
    const ready = await supabase.rpc("registration_ready");
    if (ready.error || ready.data !== true) return { error: "setup" };
    const { error } = await supabase.auth.signUp({
      email: parsed.email,
      password: parsed.password,
      options: {
        data: { full_name: parsed.full_name, zone: parsed.zone },
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });
    // Duplicate accounts receive the same response as successful registrations.
    if (
      error &&
      error.code !== "user_already_exists" &&
      error.code !== "email_exists"
    )
      return { error: "error" };
    await supabase.auth.signOut({ scope: "local" });
    return { success: true };
  } catch {
    return { error: "error" };
  }
}
export async function requestPasswordReset(
  _: AccountState,
  form: FormData,
): Promise<AccountState> {
  const credentials = parseCredentials(form.get("email"), "unused");
  if (!credentials.ok) return { error: "email" };
  const origin = canonicalSiteUrl();
  if (!origin || !supabaseConfig()) return { error: "setup" };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      credentials.email,
      { redirectTo: `${origin}/auth/callback?next=/auth/reset-password` },
    );
    if (error && (!error.status || error.status >= 500 || error.status === 429))
      return { error: "error" };
    return { success: true };
  } catch {
    return { error: "error" };
  }
}
export async function updatePassword(
  _: AccountState,
  form: FormData,
): Promise<AccountState> {
  const password = form.get("password");
  if (!validPassword(password)) return { error: "password" };
  if (password !== form.get("confirm_password")) return { error: "confirm" };
  if (!supabaseConfig()) return { error: "setup" };
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { error: "error" };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: "error" };
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    return { error: "error" };
  }
  redirect("/login");
}
export async function reviewMember(
  _: AccountState,
  form: FormData,
): Promise<AccountState> {
  await requireProfile("admin");
  const input = parseMemberReview(form);
  if (!input) return { error: "invalid" };
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("review_resident", input);
    if (error) return { error: "error" };
  } catch {
    return { error: "error" };
  }
  revalidatePath("/admin/members");
  return { success: true };
}
