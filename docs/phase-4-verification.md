# Phase 4 verification — 2026-11-23

## Executed checks

| Check                                    | Result                                      |
| ---------------------------------------- | ------------------------------------------- |
| `npm.cmd run lint`                       | Passed                                      |
| `npm.cmd run typecheck`                  | Passed                                      |
| `npm.cmd test`                           | 23 passed                                   |
| Targeted Edge route/photo-control checks | 4 passed                                    |
| Independent backend/SQL security review  | No remaining Critical or Important findings |

The targeted Edge command was:

```powershell
npm.cmd run test:e2e -- --grep 'photo controls|private admin routes|protected routes|report pages'
```

It verified existing signed-out route protection and actual authenticated photo selection/preview/removal, unsupported-file rejection, language switching and widths down to 320 pixels. It created no reports or Storage files.

The final production build and repository formatting check also passed. The build includes the evidence API, community list/detail and notification routes.

## Local image and PostgreSQL coverage

The real migrations were executed in disposable PostgreSQL. Supabase-owned Auth/Storage scaffolding was simulated; application SQL was unmodified. Tests covered:

- Supported image decoding, re-encoding to WebP and removal of EXIF/orientation metadata.
- Unsupported/spoofed/malformed/oversized images.
- Database-generated paths, resident three-slot limit and unauthorized resolution uploads.
- Trusted-only finalization/cancellation and authorized ready-only Storage read policies.
- Stable retries, fresh paths for cancelled requests and retained old paths for cleanup.
- Post-cancellation grace timestamps and prevention of later finalization.
- Explicit admin publication, safe projected fields, literal search and private confirmation identities.
- Idempotent confirmation, unconfirmation after unpublishing, inbox isolation and notification-trigger rollback.
- Actual grouped analytics, twelve month buckets, role denial and insufficient-data/null averages.
- Existing Phase 1–3 unit/database security regressions.

Independent review found a cleanup grace/retry problem during development. It was fixed before any Phase 4 migration was applied: cancellation now records its own timestamp; cleanup waits 20 minutes from cancellation; retries retain completed batch members while allocating fresh paths for cancelled members. Follow-up review reported no remaining Critical or Important issues.

## Hosted prerequisites still pending

Read-only probes confirmed the existing server key can access the private `report-photos` bucket. A production-client-bundle scan did not find the server secret value.

The final hosted schema probe returned:

```text
evidenceReady: false
engagementReady: false
analyticsReady: false
```

Therefore migrations 006, 007 and 008 still need to be applied in Supabase. The full Phase 4 live browser/API scenario was prepared but **not executed**, and no live upload/community/confirmation/notification success is claimed for this delivery state. Do not interpret the 23 local tests as hosted Storage verification.

After migration setup, run `npm.cmd run test:e2e` to execute the full suite. The Phase 4 case creates fictional test content and a temporary second resident, tests private uploads/public moderation/concurrent confirmation/inbox behavior, then unpublishes its issue and cleans the temporary account/report. Existing Phase 1–3 suites also create their documented fictional fixtures.

See `docs/phase-4.md` for migration order, the server-only evidence key, cleanup command, upload host-size requirements and remaining limitations. No deployment or Phase 5 work was performed.
