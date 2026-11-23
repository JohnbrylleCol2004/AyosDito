import { redirect } from "next/navigation";
import { currentProfile } from "@/lib/auth/session";
import { homeForProfile } from "@/lib/auth/accounts";
import { signOut } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { getLanguage } from "@/lib/i18n/server";
import { accountsDictionary } from "@/lib/i18n/accounts";
import { AuthLayout } from "@/components/auth/auth-layout";
import { ApprovalRefresh } from "@/components/auth/approval-refresh";
import { LiveUpdates } from "@/components/live-updates";
export default async function AccountPending() {
  const profile = await currentProfile();
  if (!profile) redirect("/login");
  if (profile.approval_status === "approved") redirect(homeForProfile(profile));
  const { locale, t: common } = await getLanguage();
  const t = accountsDictionary(locale);
  const client = await createClient();
  const { data } = await client
    .from("profiles")
    .select("review_note")
    .eq("id", profile.id)
    .single();
  const rejected = profile.approval_status === "rejected";
  return (
    <AuthLayout title={rejected ? t.rejected : t.pending}>
      <p>{rejected ? t.rejectedText : t.pendingText}</p>
      {data?.review_note && <p>{data.review_note}</p>}
      <LiveUpdates userId={profile.id} locale={locale} />
      <ApprovalRefresh label={t.refresh} />
      <form action={signOut}>
        <button className="button secondary">{common.signOut}</button>
      </form>
    </AuthLayout>
  );
}
