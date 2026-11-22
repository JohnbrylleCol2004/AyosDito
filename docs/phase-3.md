# Phase 3 — Admin management and resolution tracking

Phase 3 adds a protected administration workflow on the existing Phase 1–2 application. The administrator reviews real reports, records a decision with a required official note, and the owner sees the resulting status and history. No new environment variables or dependencies are required.

## Migration setup

For an existing Phase 2 project, apply the following files in Supabase SQL Editor, in order, once each:

1. `supabase/migrations/202611230003_admin_management.sql`
2. `supabase/migrations/202611230004_legacy_report_review.sql`
3. `supabase/migrations/202611230005_explicit_review_conflicts.sql`

Skip any migration that already succeeded; do not rerun Phase 1–2 migrations. A fresh project must apply all migrations in filename order before creating demo accounts. These files preserve existing report content and official history.

Migration 003 adds an optimistic `status_version`, the locked transactional transition RPC, private admin search and grouped dashboard statistics. Migration 004 preserves historical Phase 1 content during status-only reviews: tightened Phase 2 validation is enforced for new records/content edits through a trigger instead of rechecking an unvalidated legacy constraint on every status change. The original Phase 1 constraints, foreign keys and RLS remain intact. Migration 005 uses an explicit HTTP conflict code (`PT409`) for stale requests. Do not omit it: some hosted PostgREST versions repeatedly retry custom `40001` exceptions. See [Supabase's documented behavior](https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b).

## Run the application

```powershell
Set-Location C:\AyosDito
npm.cmd run dev
```

Open http://localhost:3000/login and use the existing admin demo account. `/admin` shows real counts for all four statuses plus the total, recent submissions, the oldest reports needing review, recently updated non-pending reports and category distribution. Status/category statistics are calculated from one database snapshot; no hardcoded report counts are used.

Open `/admin/reports` to search titles/tracking numbers, filter by category/status/exact zone, sort by newest/oldest/pending-first and paginate 12 reports at a time. Reporter name and last-updated time appear in this admin-only view. Pending-first uses the existing enum order, then the oldest submission first within each status group.

Open a report to review its details, reporter name/profile zone and complete official history. Select an allowed next status, write the appropriate action/rejection/completion note, click **Review change**, check the confirmation summary, and click **Confirm change**. **Keep editing** cancels confirmation without saving. The note remains available after a failed save. If the report changed in another tab, reload and review the current state before deciding again.

## Status workflow

| Current state  | Allowed next states   |
| -------------- | --------------------- |
| Pending Review | In Progress, Rejected |
| In Progress    | Resolved              |
| Resolved       | None                  |
| Rejected       | None                  |

The database continues using the existing `pending_review` enum, rather than the brief's `pending` shorthand. No enum migration or stored data rewrite is needed. Notes are required for every transition, with 1–2,000 Unicode characters after trimming. Resolved and Rejected are terminal; this phase has no reopen operation, status skipping or same-state transitions.

The browser never supplies a trusted admin identity or old status. `transition_report` reads `auth.uid()` and the actual stored report. It locks the row, checks the expected version, validates the edge, updates status/version and inserts the audit entry in the same PostgreSQL transaction. The audit uses the report's database-generated update timestamp. If audit insertion fails, PostgreSQL rolls back the status and version too. Concurrent conflicting requests using the same version produce one committed change and one conflict. Retrying a committed request does not create another audit entry.

Authenticated clients still have no direct INSERT/UPDATE/DELETE grants on reports or official history. The resident creation RPC from Phase 2 remains available, and only the controlled transition RPC permits admin status changes. Reporter information remains behind server admin checks and existing RLS. Resident timelines select official statuses, timestamps and notes without exposing admin profile details.

Residents see updates when they reload or navigate back to their report; realtime subscriptions are not part of this phase. Official history remains paginated at 25 updates per page. Historical Phase 1 content can be reviewed without changing its text; any later content edit must meet current bounds.

## Verification commands

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run format:check
```

Browser tests use Edge and the isolated `.next-e2e` server on port 3100, preserving your normal dev server on port 3000. They read the existing public Supabase variables and both `DEMO_*` account credentials from `.env.local`.

The admin acceptance test creates **three clearly labeled fictional reports** for acceptance/resolution, rejection and simultaneous conflicting decisions. Only these newly created reports are changed. The existing Phase 2 browser test creates one additional fictional report per complete suite run. Test reports remain in the controlled demo database because ordinary clients have no delete permission. Failed test runs may leave their own labeled fixtures as well. No pre-existing reports should be selected for destructive lifecycle testing.

Local PostgreSQL tests execute all real migrations, validate role/lifecycle/Unicode/version boundaries, simulate an audit-insertion failure, and verify preservation of a legal pre-Phase-2 report. Only Supabase-owned Auth/Storage scaffolding is simulated locally.

For an additional hosted SQL check, run `supabase/tests/admin.sql` as postgres in a **test** Supabase project after all migrations. It creates transactional fixtures and rolls them back. Issue `ROLLBACK;` if an assertion fails. `supabase/tests/admin-legacy.sql` is a local regression helper requiring a special fixture inserted before Phase 2; do not run that helper standalone in a hosted project.

## Changed files

| Files                                                                                             | Responsibility                                                                   |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/lib/validations/status-transitions.ts`                                                       | Allowed UI actions, note/ID/version/confirmation validation and admin filters.   |
| `src/lib/actions/admin-reports.ts`                                                                | Server admin check, mutation RPC and affected admin/resident route invalidation. |
| `src/lib/queries/admin-reports.ts`                                                                | Authorized, bounded management queries and snapshot statistics.                  |
| `src/components/admin/`                                                                           | Dashboard, management table, filters and two-stage confirmation form.            |
| `src/app/admin/`                                                                                  | Protected dashboard, report list/detail and loading state.                       |
| `src/lib/i18n/admin.ts`                                                                           | Typed English/Filipino administration copy.                                      |
| `src/app/admin.css`                                                                               | Responsive administration tables, cards, forms and dashboard.                    |
| `src/components/app-shell.tsx`, `src/components/reports/report-card.tsx`                          | Admin navigation and reusable links to the admin review route.                   |
| `supabase/migrations/202611230003–005…sql`                                                        | Additive database implementation and compatibility fixes, listed above.          |
| `tests/admin-database.test.ts`, `tests/status-transitions.test.ts`, `tests/browser/admin.spec.ts` | Local security/rollback/legacy checks and actual API/browser workflow coverage.  |

The existing resident timeline component is reused for official updates; no synthetic timestamps or progress events were added. The app uses no privileged service key for its normal requests. No deployment, uploads, attachments or Phase 4 functionality is included.
