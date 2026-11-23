# PWA verification — November 23, 2026

## Executed checks

`npm.cmd run release:check -- --browser` completed successfully against an isolated local production build and the existing hosted Supabase test/demo project.

| Check                                              | Result                                                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Formatting, ESLint, TypeScript                     | Passed                                                                                                  |
| Node/image/PostgreSQL tests                        | 27 passed, including 3 new worker privacy/lifecycle tests                                               |
| Normal and isolated production builds              | Passed                                                                                                  |
| Full production Edge suite                         | 13 passed, 2 intentional skips (1.9 minutes)                                                            |
| Known private-value scan of client JavaScript/maps | Configured server secret/demo passwords not found                                                       |
| Independent review                                 | No Critical or Important findings                                                                       |
| Visual inspection                                  | Production desktop install page, 320px Filipino install page and 320px bilingual offline page inspected |

The two skips are the development-only forwarding case and the unconfigured-installation setup case. All configured resident/admin/report/photo workflows ran. The suite uses the previously documented fictional fixtures and synthetic images; the PWA checks themselves do not submit reports or modify account data.

The new tests verified real manifest responses and PNG dimensions, regular/maskable icons, generated manifest metadata links, translations, mobile widths, browser worker registration/control, cache contents containing only `/offline.html`, offline navigation and return online. Native installation prompt states were simulated to verify dismissed/rejected/accepted/appinstalled behavior without invoking OS installation dialogs.

Worker privacy tests execute the actual worker script and verify no private navigation responses are cached, no mutation/RSC/cross-origin evidence interception, deletion limited to obsolete AyosDito offline caches and preservation of unrelated caches. Browser cache inspection after visiting login/protected pages independently confirmed only the public offline document was stored.

## What remains after redeployment

No new deployment, commit or push was performed. The existing public website therefore still needs this update deployed. Actual Android home-screen installation and Windows Start/taskbar installation must be checked manually on the permanent HTTPS origin; local headless Edge tests are not evidence that those OS installations happened.

No Supabase migration, secret/environment addition, push-notification feature, offline reporting queue, APK or EXE was introduced. Existing public-host upload-size requirements remain unchanged. See [the PWA runbook](pwa.md) for publishing, installation and worker/offline-page update instructions.
