import Link from "next/link";
import { notFound } from "next/navigation";
import { currentProfile } from "@/lib/auth/session";
import { getLanguage } from "@/lib/i18n/server";
import { getCommunity } from "@/lib/queries/engagement";
import { CommunityFrame } from "@/components/engagement/community-frame";
import { ConfirmationButton } from "@/components/engagement/confirmation-button";
import { ReportStatusBadge } from "@/components/reports/report-status-badge";
export default async function CommunityDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [{ t, locale }, result, profile] = await Promise.all([
    getLanguage(),
    getCommunity(
      { q: "", category: "", zone: "", status: "", sort: "newest", page: 1 },
      id,
    ),
    currentProfile(),
  ]);
  const e = t.engagement;
  if (result.error)
    return (
      <CommunityFrame>
        <p className="error-banner" role="alert">
          {e.loadError}
        </p>
      </CommunityFrame>
    );
  const issue = result.issues[0];
  if (!issue) notFound();
  return (
    <CommunityFrame>
      <Link className="back-link" href="/community">
        ← {e.back}
      </Link>
      <article className="panel community-detail">
        <ReportStatusBadge status={issue.status} t={t.reports} />
        <h1>{issue.public_title}</h1>
        <p>
          {t.reports.categories[issue.category]} · {issue.public_zone}
        </p>
        <p className="report-prose">{issue.public_summary}</p>
        <p>
          {new Intl.NumberFormat(locale).format(issue.confirmation_count)}{" "}
          {e.confirmations}
        </p>
        {profile?.role === "resident" ? (
          <ConfirmationButton
            id={id}
            confirmed={issue.viewer_confirmed}
            t={e}
          />
        ) : !profile ? (
          <Link href="/login">{e.signIn}</Link>
        ) : null}
      </article>
      <p className="community-privacy">{e.privacy}</p>
    </CommunityFrame>
  );
}
