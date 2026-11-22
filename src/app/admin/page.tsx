import { requireProfile } from "@/lib/auth/session";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export default async function AdminDashboardPage() {
  const profile = await requireProfile("admin");
  return <AdminDashboard profile={profile} />;
}
