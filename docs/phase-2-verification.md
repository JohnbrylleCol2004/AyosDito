# Phase 2 verification — 2026-11-23

## Executed and passed

| Check                   | Result                                                             |
| ----------------------- | ------------------------------------------------------------------ |
| `npm.cmd run lint`      | Passed                                                             |
| `npm.cmd run typecheck` | Passed                                                             |
| `npm.cmd test`          | 13 passed                                                          |
| `npm.cmd run build`     | Passed; report list, submission and dynamic detail routes included |
| `npm.cmd run test:e2e`  | 5 passed, 1 skipped in Microsoft Edge                              |

The skipped browser test is the **unconfigured installation** test. The current workspace has a configured Supabase project, so that setup-only test does not apply. Neither the live authentication test nor the live reporting test was skipped.

## Live Supabase coverage

- Both Phase 2 migrations were applied by the user; authenticated read-only probes confirmed the new column and search function are available.
- Real resident and administrator password sign-in, protected dashboards and local sign-out passed.
- Signed-out report routes redirected to login.
- Client validation rejected an empty report before submission.
- A fictional resident report was inserted through the Server Action and database RPC. The detail page displayed the stored title, tracking number, pending-review status and initial submission event.
- Retrying the same request through the authenticated Supabase API returned the same report ID. The dashboard count increased by one, rather than by two.
- Direct resident status UPDATE failed at the API/database boundary.
- Title punctuation and tracking-number search, category/status filters, sort selection, no-match empty state and out-of-range pagination handling passed.
- English/Filipino detail labels and language persistence after reload passed.
- Missing and malformed IDs produced generic not-found content. An administrator could open the authorized report detail and was redirected away from the resident creation page.
- Dashboard and detail viewport checks covered 1440, 1024, 768, 390 and 320 pixels. Desktop form and mobile detail screenshots were visually inspected.

Two fictional test reports were created during development: the initial attempt and the final successful acceptance run. Both are clearly labeled `Demo test` and contain fictional information. They remain in the controlled demo database; no pre-existing reports were deleted or edited. Retrying a submission can consume a sequence number without creating a row, so tracking-number gaps are expected.

## Database tests and review

Embedded PostgreSQL executed the production migrations and assertions covering resident isolation, admin reads, role protection, unique tracking numbers, blocked direct mutations, retry safety, changed-payload token reuse, anonymous denial, invalid categories, Unicode whitespace/padding and literal search. The Supabase-owned Auth/Storage schemas are scaffolded for these local SQL tests; application SQL is unchanged.

An independent reviewer identified two Important issues: Unicode whitespace parity and punctuation search. Both were reproduced by failing regression checks and fixed in the additive hardening migration. Follow-up review confirmed that both findings are resolved, with no remaining Critical or Important findings.

The first live reporting attempt successfully created its report but later timed out because the test did not wait for the asynchronous language change before using English labels. Adding the language assertion fixed the test race; the final complete browser suite passed.

## Remaining scope

The transactional SQL script is provided for an additional run in a hosted **test** Supabase project. It was executed in embedded PostgreSQL here; hosted API/browser checks are listed separately above. Official administrative status mutations and photo uploads are not implemented in this phase. No deployment was performed, and Phase 3 requires user approval.
