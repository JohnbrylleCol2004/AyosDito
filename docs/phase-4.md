# Phase 4 — Community features and private evidence

Phase 4 extends the existing resident/admin flows with private photo evidence, separately moderated community summaries, affected-resident confirmations, a private notification center and grouped analytics. Phase 5 and deployment are not included.

## Database setup

After all existing Phase 1–3 migrations, run these files in order in your Supabase SQL Editor, once each:

1. `supabase/migrations/202611230006_evidence.sql`
2. `supabase/migrations/202611230007_engagement.sql`
3. `supabase/migrations/202611230008_analytics.sql`

Do not reapply a file that already succeeded. The migrations reuse the existing private `report-photos` bucket and existing report/photo/confirmation tables. No existing report is automatically published. Existing private report RLS remains; confirmation identities become readable only by the confirming resident, with aggregate counts available through the safe community RPC.

## Server upload configuration

Keep these values in `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=<actual-project-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
SUPABASE_SECRET_KEY=<server-only-secret-key>
```

The last value was previously needed only for demo provisioning. In Phase 4 it is also required by the **server-only evidence worker**. It must never have a `NEXT_PUBLIC_` prefix, appear in client components, or be sent to the browser. Normal report creation, status changes, publication, confirmations, notifications and private reads continue to use the signed-in user's JWT and database authorization.

The worker validates the authenticated user and obtains a database-authorized reservation before performing privileged Storage writes. Keeping raw authenticated Storage INSERT/UPDATE/DELETE unavailable prevents a user from bypassing actual image validation through the Storage API. Finalization and cancellation RPC execution is reserved for the trusted server role. Authorized private viewing uses the user's own Storage permissions.

Restart the dev server after changing environment values:

```powershell
Set-Location C:\AyosDito
npm.cmd ci
npm.cmd run dev
```

## Photos and recovery

Residents can choose up to three JPEG/PNG/WebP files during report creation or add photos to an existing owned Pending Review/In Progress report. The limit is **three resident photos per report**, including active concurrent reservations. Administrators add separate official resolution evidence; residents cannot upload or alter that evidence. Admin uploads are limited to three files per request, with gallery pagination for longer histories.

Each original file must be no larger than **5 MiB**. The server checks MIME type, decodes the actual bytes with a 40-million-pixel bound, rejects unreadable/mismatched/animated images, honors orientation and re-encodes to WebP. Output is size-checked again. EXIF/XMP/IPTC information, including image location metadata, is not retained. Sharp is a direct dependency for this purpose. Previews remain local until submission and selected files can be removed.

The database generates random `.webp` storage paths. A user-supplied request UUID is used only for idempotency, combined server-side with the index and processed-content digest; it is never trusted for permission or storage-path selection. A retry reuses completed members of its batch and uses a fresh path for a previously cancelled member.

Ready evidence alone appears in galleries. Application-issued signed URLs last **120 seconds**; use **Refresh photos** to replace expired links. An authorized user can also download an image or request a URL through their permitted raw Storage read API, so 120 seconds describes application-issued links rather than a universal database-enforced signing cap. No private URL or photo is included in community projections.

If report creation succeeds but a photo fails, the form links to the saved report instead of inviting a duplicate report. Successfully uploaded photos remain visible; complete missing evidence there. Database and Storage cannot share one transaction: the implementation reserves privately, uploads validated bytes, then marks metadata ready. On failure, row-locked cancellation prevents a late finalization; ambiguous failures retain private metadata rather than risk deleting a committed file.

Interrupted reservations expire after 15 minutes. Run maintenance on a trusted machine:

```powershell
npm.cmd run evidence:cleanup
```

The command cancels expired pending rows first, then deletes only cancelled objects whose **cancellation time is over 20 minutes old**. New cancellations wait for a later run. Ready evidence is excluded. Up to 100 pending and 100 cancelled reservations are handled per run; repeat if there is a backlog. Run it periodically through an appropriate trusted scheduler when deploying; no schedule or external automation is created by this delivery.

The Node app accepts a 16 MiB multipart request to accommodate three 5 MiB files plus overhead. The hosting/reverse-proxy request limit must also support that size. Hosts with smaller limits need a separately designed authenticated upload transport before deployment; this phase does not claim deployment compatibility with every platform's body limit.

## Community moderation and confirmations

Open a private report as an admin at `/admin/reports/[id]`. After acceptance, enter a **separate public title, summary and general zone**, check that they contain no personal/sensitive information, then publish. Private report text is not copied into these fields. Only explicitly published In Progress/Resolved issues appear at `/community` and `/community/[id]`; accepted status alone is insufficient. An admin can unpublish at any time.

The anonymous-safe RPC projects only the issue ID, moderated text/coarse zone, category/status, aggregate confirmation count and whether the current viewer confirmed. It does not return reporter/confirming identities, precise location details or photo metadata. Manual moderation is still responsible for deciding whether authored public text is safe; the database enforces explicit approval and field/status rules, not automated personal-information detection.

Residents can confirm or remove their own confirmation. PostgreSQL uses the authenticated identity and the existing unique report/user constraint. Requests set a desired boolean rather than performing an unsafe toggle, so simultaneous duplicate requests do not inflate counts. Adding requires a currently published issue; removing one's own confirmation remains allowed after unpublication.

Board search is literal, category/status/zone filters are server-side, and results use 12-item pagination. Most-confirmed ordering uses actual aggregate counts. Existing resident/admin private filters remain available.

## Notifications and analytics

The audit-insert trigger creates one notification per intended recipient and official status event. If notification insertion fails, the same transaction rolls back its audit and status change. Existing historical updates are not retroactively notified. Stored title/message keys are translated at display time.

The navigation bell and `/notifications` show only the signed-in recipient's records. Individual mark-read and mark-all-read functions cannot select another recipient or create official notices. The resident dashboard includes the latest private notification summary. Updates appear on refresh/navigation; no realtime subscriptions, email or SMS are included.

Admin analytics aggregate in PostgreSQL under admin authorization: status/category totals, the top 12 zones, the last 12 monthly submission buckets in Philippine time, and average time from submission to the first recorded official resolution. Averages require at least **three** resolved reports with valid official completion timestamps; otherwise the UI states that data is insufficient. The sample count is shown. Publication edits do not change this average because it uses official audit timestamps, not the report's latest generic update time.

## Verification

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run format:check
```

Local tests execute the actual migrations in disposable PostgreSQL, with Supabase-owned infrastructure scaffolded. They cover image decoding/metadata removal, Storage read policies, reservation slots/retries/cancellation, moderation projections, unique confirmations, notification isolation/transaction rollback and real aggregate calculations.

The Phase 4 browser scenario additionally needs all migrations and both demo accounts plus the upload server key. It uses synthetic colored images and fictional issue text, not real evidence. It creates a temporary second resident to verify privacy and mark-all behavior, cleans up that temporary account/report, and removes the fictional main issue from the public board at the end. The main fictional report and private photos may remain for controlled-demo inspection. Existing test suites also create their own labeled fixtures as documented in earlier guides.

## Important changes

| Files                                                    | Purpose                                                                                        |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/lib/evidence/`, upload API route                    | Byte validation, re-encoding, server-only Storage writes and failure compensation.             |
| `src/components/evidence/`, `evidence-section.tsx`       | Local previews, upload controls and paginated private galleries.                               |
| `src/lib/actions/engagement.ts`, `queries/engagement.ts` | Authorized moderation/confirmation/inbox operations and safe queries.                          |
| `src/app/community/`, `src/app/notifications/`           | Public-safe issue board/detail and private notification center.                                |
| `src/components/engagement/`                             | Moderation panel, confirmation controls, notification bell/summary.                            |
| `src/components/admin/community-analytics.tsx`           | Lightweight zone/month/resolution presentation from grouped RPC results.                       |
| `src/lib/i18n/{evidence,engagement,analytics}.ts`        | English/Filipino labels, errors and accessibility text.                                        |
| `scripts/cleanup-evidence.mjs`                           | Bounded trusted cleanup of interrupted uploads.                                                |
| Migrations 006–008                                       | Storage permission/reservation rules, publication, confirmations, notifications and analytics. |

This document records Phase 4. Subsequent release checks and deployment preparation are documented in [Phase 5](phase-5.md). No public deployment or external messaging has been performed.
