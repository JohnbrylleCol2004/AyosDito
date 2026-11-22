# Phase 2 — Resident reporting and tracking

The resident workflow now includes `/reports/new`, `/reports` and `/reports/[id]`. It reuses Phase 1 authentication, profiles, RLS and language preferences. There are no new environment variables or runtime dependencies.

## Apply database changes

For an existing Phase 1 Supabase project, open SQL Editor and run these files **in order**, once each:

1. `supabase/migrations/202611230001_reporting.sql`
2. `supabase/migrations/202611230002_reporting_hardening.sql`

Do not rerun a migration that already succeeded. The second file is a separate follow-up because the first was applied during development. Both are required for the final Phase 2 application. A new project must first apply `202611220001_foundation.sql` and create its demo accounts as described in README.

The changes preserve existing rows and foreign keys. Phase 1 enum values `pending_review` and `public_facility` remain unchanged: the interface labels them Pending Review and Public Facilities, or their Filipino translations. Historical rows are retained even if they exceed the new limits. Phase 3 migration 004 replaces the unvalidated length check with insert/content-edit validation so historical reports can receive status-only updates while preserving their original text; new content still must meet the current bounds.

## Run and verify

```powershell
Set-Location C:\AyosDito
npm.cmd run dev
```

Sign in as the existing resident at http://localhost:3000/login. Choose **Submit new report**, complete the fields, and submit. A successful save opens the report detail page with a database-generated tracking number, Pending Review status, the submission event and the actual submission time. Refreshing the detail page does not create another report.

The resident can search My Reports by title or tracking number, filter by category/status and sort by age. Lists contain 12 reports per page, with deterministic ID ordering when timestamps match. Search is case-insensitive and literal: punctuation, percent and underscore are not query operators. A search RPC passes text as a parameter and applies owner filtering and RLS. Server queries clamp out-of-range pages rather than loading all records.

The dashboard shows actual counts and the five latest permitted reports. Administrators retain their dashboard and may open authorized report detail pages; resident creation is restricted to residents. Admin status controls belong to Phase 3.

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

Browser tests use an isolated `.next-e2e` directory and port 3100, so an existing development server on port 3000 can remain open. Set `E2E_PORT` to choose another test port. `.env.local` supplies the same public configuration and demo credentials used in Phase 1.

The live reporting test requires the resident demo credentials and both Phase 2 migrations. It creates a **clearly labeled fictional report**, retries the same submission through the authenticated API, checks that the original report ID is returned, and verifies the owner/default status, search, dashboard count, language persistence and private detail access. It uses the admin demo account too when configured. These fictional test reports remain in the controlled demo database because resident delete privileges are deliberately absent. Every full rerun creates one additional fictional report.

## Database security checks

`npm test` runs the production migrations in embedded PostgreSQL and executes `supabase/tests/reporting.sql`. Supabase's Auth/Storage infrastructure is scaffolded for this local database test; the application SQL itself is unmodified.

For an additional hosted check, run `supabase/tests/reporting.sql` as postgres in the SQL Editor of a **test Supabase project** after all three migrations. It creates fictional users/reports in a transaction and rolls them back. If an assertion fails, issue `ROLLBACK;` before continuing. Sequence numbers are intentionally not rolled back, so gaps in tracking numbers are normal.

The SQL checks cover:

- Role and identity checks at the database function boundary.
- Owner/default status and database-generated tracking/timestamps.
- Duplicate request tokens and mismatched-payload replays.
- Direct INSERT/UPDATE/DELETE denial and anonymous access denial.
- Private read/search isolation between two residents and authorized admin reads.
- Invalid categories, blank and Unicode whitespace-only fields, and Unicode padding at exact maximum lengths.
- Literal punctuation/wildcard search without filter injection.

Client and server both validate title 5–120 characters, description 20–2,000, zone 1–80, and optional location details up to 200. JavaScript counts Unicode code points to match PostgreSQL `char_length`; the database trims the same Unicode whitespace as JavaScript. Trusted fields are never accepted as browser form values. A disabled submit button reduces double clicks, while the database's unique `(reporter_id, submission_key)` constraint prevents duplicate retries across requests. A fresh form has a fresh token and intentionally represents a separate report; content-based duplicate detection remains a future feature.

## Important files

| File                             | Purpose                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------- |
| `src/types/reports.ts`           | Shared field, category, status and report types.                                |
| `src/lib/validations/reports.ts` | Shared form validation, filter normalization and pagination URLs.               |
| `src/lib/actions/reports.ts`     | Authenticated report-creation Server Action; calls the controlled database RPC. |
| `src/lib/queries/reports.ts`     | Bounded list/history queries, recent reports and private detail lookup.         |
| `src/components/reports/`        | Accessible form, cards, filters, badges and chronological timeline.             |
| `src/lib/i18n/reports.ts`        | Typed English and Filipino reporting dictionaries.                              |
| `src/app/reports/`               | Submission, list, detail and loading routes.                                    |
| `src/app/reports.css`            | Responsive extensions to the existing design.                                   |

The report timeline always includes the real submission event. Official updates come only from `report_updates`, sorted chronologically and paginated at 25 updates per page. No notes or progress timestamps are invented. Missing and unauthorized report IDs share a generic not-found response. Operational query failures display a translated error instead of pretending that no reports exist.

Photo uploads, confirmations, administrative mutations and deployment are outside Phase 2. A text note explains that photos arrive in Phase 4; no inactive upload control is present. Phase 3 requires your approval after Phase 2 acceptance.
