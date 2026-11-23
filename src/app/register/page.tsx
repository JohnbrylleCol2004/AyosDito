import { redirect } from "next/navigation";
import { currentProfile } from "@/lib/auth/session";
import { homeForProfile } from "@/lib/auth/accounts";
import { getLanguage } from "@/lib/i18n/server";
import { accountsDictionary } from "@/lib/i18n/accounts";
import { AccountForm } from "@/components/auth/account-form";
import { AuthLayout } from "@/components/auth/auth-layout";
export default async function RegisterPage() {
  const profile = await currentProfile();
  if (profile) redirect(homeForProfile(profile));
  const { locale } = await getLanguage();
  const t = accountsDictionary(locale);
  return (
    <AuthLayout title={t.register}>
      <p>{t.registrationIntro}</p>
      <AccountForm mode="register" t={t} />
    </AuthLayout>
  );
}
