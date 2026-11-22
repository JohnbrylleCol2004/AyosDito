# Phase 3 verification — 2026-11-23

## Final executed checks

| Check                      | Result                                                      |
| -------------------------- | ----------------------------------------------------------- |
| `npm.cmd test`             | 17 passed                                                   |
| `npm.cmd run lint`         | Passed                                                      |
| `npm.cmd run typecheck`    | Passed                                                      |
| `npm.cmd run build`        | Passed; includes `/admin/reports` and `/admin/reports/[id]` |
| `npm.cmd run test:e2e`     | 7 passed, 1 skipped in Edge (57.5 seconds)                  |
| `npm.cmd run format:check` | Passed                                                      |

The skipped browser case is the unconfigured-installation setup test: Supabase is configured in this workspace. Live resident, admin and reporting workflows were executed, not skipped.

## Live Supabase/API/browser evidence

- Existing admin and resident demo accounts authenticated successfully.
- User applied Phase 3 migrations; admin statistics and the explicit HTTP 409 conflict response were verified live.
- A newly created fictional pending report was accepted through the two-stage confirmation form, creating one official audit entry.
- Cancelling the confirmation summary left the report pending.
- The accepted report was resolved with a completion note. The page then offered no further status actions.
- A separate fictional report was rejected with an explanation; reopening it was denied.
- Pending-to-resolved skipping, stale requests and terminal changes were rejected.
- Two simultaneous API calls used version 0 on another newly created report. Exactly one committed and the other returned `PT409`; exactly one audit entry existed afterward, with the authenticated admin ID.
- Resident mutation attempts were denied; resident admin-search returned no records and the administrator's private profile was inaccessible.
- Direct audit modification by an authenticated admin browser client was denied.
- All five dashboard counts matched a live snapshot-statistics RPC result.
- Literal title search with parentheses, category/status/exact-zone filters, sort selection, no-match state and out-of-range pagination handling passed.
- Management layout overflow checks passed at 1440, 1024, 768, 390 and 320 pixels. Desktop review and mobile management screenshots were visually inspected.
- Filipino management labels and language persistence after reload passed.
- The resident saw the acceptance/completion notes and full three-event timeline for the resolved report, and the official rejection explanation for the rejected report.
- Signed-out admin routes redirected to login; resident attempts at management/detail routes returned them to their own dashboard.
- The existing Phase 1–2 browser workflows still passed, including resident report creation, duplicate retry, own search and private tracking.

## SQL regression tests and independent review

Disposable embedded PostgreSQL ran the real application migrations. Tests covered lifecycle edges, missing identity, role denial, direct-write denial, Unicode note bounds and blank notes, expected-version rejection, and protected official history.

A temporary test trigger deliberately rejected audit insertion. The test confirmed that report status, version and audit row all rolled back. This fault injection was local only; no hosted trigger or artificial failure was installed.

Independent review identified a historical-content compatibility issue. A legal Phase 1 fixture with title length 130, description length 10 and location length 220 was inserted before Phase 2 migrations. It reproduced the failure under the old unvalidated check, then successfully transitioned with preserved text after migration 004. Separate checks confirmed that new invalid reports and invalid content edits still fail. The reviewer confirmed the fix and found no remaining Critical or Important issues.

The first hosted suite encountered a real PostgREST issue: deliberately raising `40001` for application conflicts caused retries instead of a prompt stale-review response. Migration 005 changes only that application conflict to `PT409`, following [Supabase's documented guidance](https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b). A live stale-version probe returned HTTP 409 promptly and the final concurrent test passed.

## Test data and limits

Two full browser runs during this phase created eight clearly labeled fictional records in total: six `Demo admin test` fixtures and two `Demo test` resident fixtures. The initial failed run left its own accepted/pending fixtures. Only newly created fixtures were used for lifecycle changes; pre-existing report content/statuses were not edited or deleted. The final run created exactly four records, and duplicate-request retries returned the original report rather than adding records.

The hosted transactional `supabase/tests/admin.sql` script is provided for an additional test-project run; the full script and fault injection were executed in embedded PostgreSQL here. Live API/browser coverage is listed separately above. Historical-content migration behavior was reproduced locally rather than fabricating legacy records in the user's hosted project.

Residents receive fresh official data on navigation/reload; there is no realtime push subscription. No uploads, reopening, assignments, deployment or Phase 4 work was implemented.
