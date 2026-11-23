import Link from "next/link";
import { getLanguage } from "@/lib/i18n/server";
import { accountsDictionary } from "@/lib/i18n/accounts";
import { AuthLayout } from "@/components/auth/auth-layout";
export default async function LinkError() {
  const { locale } = await getLanguage();
  const t = accountsDictionary(locale);
  return (
    <AuthLayout title={t.linkError}>
      <Link href="/auth/forgot-password">{t.reset}</Link>
    </AuthLayout>
  );
}
