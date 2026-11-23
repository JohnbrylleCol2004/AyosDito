import { getLanguage } from "@/lib/i18n/server";
import { accountsDictionary } from "@/lib/i18n/accounts";
import { AccountForm } from "@/components/auth/account-form";
import { AuthLayout } from "@/components/auth/auth-layout";
export default async function ForgotPassword() {
  const { locale } = await getLanguage();
  const t = accountsDictionary(locale);
  return (
    <AuthLayout title={t.reset}>
      <AccountForm mode="recovery" t={t} />
    </AuthLayout>
  );
}
