import { redirect } from "next/navigation";
import { Notice } from "@/components/notice";
import { supabaseConfig } from "@/lib/supabase/config";
export default function Setup() {
  if (supabaseConfig()) redirect("/login");
  return <Notice setup />;
}
