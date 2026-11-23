import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getLanguage } from "@/lib/i18n/server";
import { accountsDictionary } from "@/lib/i18n/accounts";
import { AppShell } from "@/components/app-shell";
import { MemberReview } from "@/components/auth/member-review";
import { ApprovalRefresh } from "@/components/auth/approval-refresh";
export default async function MembersPage() {
  const profile = await requireProfile("admin");
  const { locale } = await getLanguage();
  const t = accountsDictionary(locale);
  const client = await createClient();
  const { data, error } = await client
    .from("profiles")
    .select("id,full_name,zone,created_at")
    .eq("role", "resident")
    .eq("approval_status", "pending")
    .order("created_at")
    .limit(100);
  if (error)
    throw new Error(
      "Resident approval setup requires migration 202611240010_resident_approval.sql or database connectivity.",
    );
  return (
    <AppShell profile={profile} section="members">
      <header className="page-heading">
        <div>
          <h1>{t.members}</h1>
          <p>{t.membersIntro}</p>
        </div>
        <ApprovalRefresh label={t.refresh} />
      </header>
      {!data?.length && <p className="empty-state">{t.empty}</p>}
      {data?.map((member) => (
        <section className="panel operations-panel" key={member.id}>
          <h2>{member.full_name}</h2>
          <p>
            {member.zone} ·{" "}
            {new Date(member.created_at).toLocaleDateString(
              locale === "fil" ? "fil-PH" : "en-PH",
            )}
          </p>
          <MemberReview id={member.id} t={t} />
        </section>
      ))}
    </AppShell>
  );
}
