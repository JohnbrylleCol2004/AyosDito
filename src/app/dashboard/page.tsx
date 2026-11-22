import { requireProfile } from "@/lib/auth/session";
import { Dashboard } from "@/components/dashboard";

export default async function ResidentDashboard() {
  const profile = await requireProfile("resident");
  return <Dashboard profile={profile} />;
}
