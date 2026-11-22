import { redirect } from "next/navigation";
import { currentProfile } from "@/lib/auth/session";
import { homeForRole } from "@/lib/auth/rules";
import { supabaseConfig } from "@/lib/supabase/config";

export default async function Home() {
  if (!supabaseConfig()) redirect("/setup");
  const profile = await currentProfile();
  redirect(profile ? homeForRole(profile.role)! : "/login");
}
