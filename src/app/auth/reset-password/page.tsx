import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { getLanguage } from "@/lib/i18n/server";
import { accountsDictionary } from "@/lib/i18n/accounts";
import { AccountForm } from "@/components/auth/account-form";
import { AuthLayout } from "@/components/auth/auth-layout";
export default async function ResetPassword() {
  if (!supabaseConfig()) redirect("/setup");
  const client = await createClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect("/auth/forgot-password");
  const { locale } = await getLanguage();
  const t = accountsDictionary(locale);
  return (
    <AuthLayout title={t.newPassword}>
      <AccountForm mode="password" t={t} />
    </AuthLayout>
  );
}
