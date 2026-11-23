# Phase 5 verification — November 23, 2026

## Executed results

`npm.cmd run release:check -- --browser` completed successfully against the configured hosted Supabase project and a local **production** Next.js server:

| Check                                         | Observed result                                        |
| --------------------------------------------- | ------------------------------------------------------ |
| Repository formatting                         | Passed                                                 |
| ESLint                                        | Passed                                                 |
| Node/image/PostgreSQL tests                   | 24 passed, 0 failed                                    |
| Production application build                  | Passed                                                 |
| TypeScript                                    | Passed                                                 |
| Production-mode Edge suite                    | 10 passed, 1 intentional setup-only skip (1.8 minutes) |
| Client JavaScript/source-map scan             | Configured server key/demo passwords not found         |
| `npm.cmd audit --omit=dev --audit-level=high` | 0 vulnerabilities reported                             |
| Invalid release URL preflight                 | Rejected before commands; private marker not printed   |
| Independent review                            | No remaining Important findings                        |

The browser suite covers Phase 1–4 workflows using real hosted Auth, private Storage and database RPCs. The configured-installation run intentionally skips the unconfigured setup test; no live-account workflow was skipped. The suite includes security headers, foreign/missing upload Origin denial and signed-out upload denial. See [Phase 4 coverage](phase-4-verification.md) for photo/moderation/notification checks and the runbook for fixture behavior.

After inspecting the mobile evidence screenshot, the Phase 4 production scenario was strengthened to scroll every lazy gallery image into view and assert browser decoding (`complete` and positive `naturalWidth`). That targeted production run also passed: `1 passed (51.5s)`. The resulting mobile screenshot was visually inspected with all four synthetic photos rendered. Repository formatting passed after the final documentation changes.

## Defects fixed during verification

- Valid follow-up evidence uploads returned `csrf`: the comparison used Next Proxy's normalized internal URL hostname. It now compares Origin authority with incoming Host and rejects absent/foreign origins. The host must preserve public Host and enforce HTTPS.
- Production file selection could occur before hydration attached validation/preview handlers. The input now stays disabled through SSR/initial hydration and becomes enabled once React is ready. Browser coverage asserts the SSR-disabled state, client-enabled state and actual preview/removal behavior.
- Notification mark-all verification read the database before the asynchronous action committed. The assertion now polls for the actual database result.
- The release preflight now rejects invalid Project URLs, preventing missing live coverage from being mistaken for a passing release.

## Release boundaries

No public deployment was created, no hosting charges/configuration were enabled, and no new SQL migration is required. The chosen hosting project, actual public URL and near-maximum multipart upload behavior through its ingress/CDN remain unverified. The [Phase 5 runbook](phase-5.md) describes the concrete configuration, promotion checks, rollback/cleanup and demonstration steps.

These results are from the local production server plus the configured hosted Supabase project. They do not establish public-host performance, provider ingress compatibility or a completed public release. Dependency audit and known-value bundle scans are useful checks, not a security guarantee.
