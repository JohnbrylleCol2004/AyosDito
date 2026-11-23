import { redirect } from "next/navigation";
import { currentProfile } from "@/lib/auth/session";
import { homeForProfile } from "@/lib/auth/accounts";
import { supabaseConfig } from "@/lib/supabase/config";

export default async function Home() {
  if (!supabaseConfig()) redirect("/setup");
  const profile = await currentProfile();
  redirect(profile ? homeForProfile(profile)! : "/login");
}
