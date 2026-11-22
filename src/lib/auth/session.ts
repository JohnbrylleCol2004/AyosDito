import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { homeForRole, type Role } from "./rules";

export type Profile = {
  id: string;
  full_name: string;
  role: Role;
  zone: string | null;
};

export async function currentProfile(): Promise<Profile | null> {
  if (!supabaseConfig()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) return null;
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role, zone")
    .eq("id", data.claims.sub)
    .single();
  if (profileError || !profile || !homeForRole(profile.role))
    redirect("/account-unavailable");
  return profile as Profile;
}

export async function requireProfile(role?: Role) {
  if (!supabaseConfig()) redirect("/setup");
  const profile = await currentProfile();
  if (!profile) redirect("/login");
  if (role && profile.role !== role) redirect(homeForRole(profile.role)!);
  return profile;
}
