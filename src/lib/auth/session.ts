import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { homeForRole, type Role } from "./rules";
import { type ApprovalStatus } from "./accounts";

export type Profile = {
  id: string;
  full_name: string;
  role: Role;
  zone: string | null;
  approval_status: ApprovalStatus;
};

export const currentProfile = cache(async (): Promise<Profile | null> => {
  if (!supabaseConfig()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) return null;
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role, zone, approval_status")
    .eq("id", data.claims.sub)
    .single();
  if (profileError?.code === "42703" || profileError?.code === "PGRST204")
    throw new Error(
      "Resident approval setup requires migration 202611240010_resident_approval.sql.",
    );
  if (
    profileError ||
    !profile ||
    !homeForRole(profile.role) ||
    !["pending", "approved", "rejected"].includes(profile.approval_status)
  )
    redirect("/account-unavailable");
  return profile as Profile;
});

export async function requireProfile(role?: Role) {
  if (!supabaseConfig()) redirect("/setup");
  const profile = await currentProfile();
  if (!profile) redirect("/login");
  if (profile.approval_status !== "approved") redirect("/account-pending");
  if (role && profile.role !== role) redirect(homeForRole(profile.role)!);
  return profile;
}
