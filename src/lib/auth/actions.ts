"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { homeForRole, parseCredentials } from "./rules";

export type LoginState = {
  error?: "email" | "password" | "credentials" | "connection" | "profile";
};

export async function signIn(
  _previous: LoginState,
  form: FormData,
): Promise<LoginState> {
  if (!supabaseConfig()) redirect("/setup");
  const credentials = parseCredentials(form.get("email"), form.get("password"));
  if (!credentials.ok) return { error: credentials.field };
  const supabase = await createClient();
  let destination: string | null = null;
  try {
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    if (error || !data.user)
      return {
        error:
          error && error.status && error.status >= 500
            ? "connection"
            : "credentials",
      };
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();
    destination = homeForRole(profile?.role);
    if (!destination) {
      await supabase.auth.signOut({ scope: "local" });
      return { error: "profile" };
    }
  } catch {
    return { error: "connection" };
  }
  redirect(destination);
}

export async function signOut() {
  if (supabaseConfig()) {
    const supabase = await createClient();
    // The pinned Auth SDK clears this device's cookies before remote revocation.
    // A remote outage must not strand an already signed-out user on an error screen.
    // Local storage/cookie failures still throw and reach the translated error boundary.
    await supabase.auth.signOut({ scope: "local" });
  }
  redirect("/login");
}
