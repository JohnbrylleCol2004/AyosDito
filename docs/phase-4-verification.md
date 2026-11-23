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

## Hosted verification completed during Phase 5

On November 23, 2026, read-only hosted probes confirmed evidence, engagement and analytics RPC availability (migrations 006–008 applied). The targeted live Phase 4 Edge scenario then passed: `1 passed (53.9s)`.

It exercised real Auth, Storage, RPCs and browser forms using synthetic images and fictional reports: resident three-photo limit, WebP/EXIF stripping, unauthorized reads and raw writes denied, forbidden resolution uploads, safe public moderation, concurrent duplicate confirmations, unconfirmation, official resolution evidence, private notification read/mark-all, analytics, bilingual persistence and responsive widths. Its temporary resident/report were cleaned up and the main fictional issue unpublished.

The first hosted run exposed a valid-upload CSRF rejection caused by Next Proxy's internal request URL hostname. Phase 5 compares the browser Origin authority against incoming Host, with foreign/absent-origin regression coverage. A premature notification assertion now waits for the asynchronous server action to commit.

See [Phase 5 release verification](phase-5-verification.md) for the full production-mode suite and current deployment status. Local checks and this hosted test do not verify a public hosting provider's upload/CDN limits.
