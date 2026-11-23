# Phase 5: verification and release runbook

The Phase 5 request included the Phase 4 attachment again. This delivery follows the original testing/security/deployment-preparation roadmap. No new business features or database migrations are introduced. Public deployment is pending a selected hosting project and deployment smoke checks.

## Repeatable release checks

Use Node 22.18 or newer, install Microsoft Edge, then:

```powershell
npm.cmd ci
npm.cmd run release:check
npm.cmd run release:check -- --browser
```

The first command checks formatting, lint, local database/image tests, a production build, TypeScript and known private values in browser JavaScript/source maps. The second also builds an isolated `.next-e2e` production application and runs the full Edge suite against `next start` on port 3100. Your development server on 3000 can remain running. A failed command stops the release check. This is a local release gate, not a deployment command or a comprehensive secret scanner.

`.env.local` must contain the three application variables from `.env.example`; browser verification also requires all four demo credential variables and migrations 001–008. Keep actual passwords and server keys out of source control, client bundles, screenshots, shared traces and build logs. Browser traces can contain session cookies, private evidence links and fictional private content; do not publish `test-results`.

Live tests create labeled fictional reports and synthetic images. The community scenario unpublishes its report and removes its temporary resident/report; its main report, evidence and official audit history remain private. Other lifecycle tests leave fictional records as documented in Phase 3. Run against a dedicated demo/test Supabase project when preparing a public demonstration. The configured-installation suite intentionally skips the setup-only test; skipped live-account cases are not release evidence.

## Hosting configuration

Use a Node.js host supporting the installed Next.js version and Sharp native dependencies. Build with `npm ci` and `npm run build`; start with `npm run start`. Static export cannot serve the authenticated pages, Server Actions or evidence route. Set these variables in the host's environment:

| Variable                               | Scope                                                                |
| -------------------------------------- | -------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Public Project URL; available during build and runtime               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public publishable key; available during build and runtime           |
| `SUPABASE_SECRET_KEY`                  | Server runtime only, for validated evidence uploads and compensation |

Demo passwords are local test/provisioning inputs and are not required in the deployed application. Never give the server secret a `NEXT_PUBLIC_` prefix. Apply only missing migrations, in order; do not rerun all migration files over an existing project. Migrations 006–008 were confirmed present in the current test project during this phase.

Configure HTTPS, preserve the browser's public `Host` through the reverse proxy, and do not cache authenticated HTML, API responses or Server Action responses at the CDN. The upload CSRF guard compares the Origin authority with Host; HTTP-to-HTTPS redirection and secure transport must be enforced at the host. Forwarded-host headers are not trusted by the application. Supabase Auth Site URL/redirect allowlists must use the chosen public URL; review Auth rate limits before sharing access. Keep the private `report-photos` bucket private.

### Upload transport is a deployment gate

AyosDito accepts up to three 5 MiB files in a batch, with a 16 MiB multipart request ceiling. The complete ingress path, including reverse proxy, must support that ceiling. Setting Next's Server Action limit does not raise a hosting provider's ingress limit.

As checked on November 23, 2026, Vercel defaults to a smaller 4.5 MB body limit. Its new 20 MiB public beta requires `VERCEL_SUPPORT_LARGE_REQUEST_BODY=1`, Fluid Compute and the Performance 4 GB function memory setting on supported runtimes. Verify account eligibility and cost, configure a preview project first, and test both report creation with photos and the follow-up evidence API near the maximum batch size before promoting it. The current application uses Node.js evidence processing and Next Proxy; no Edge runtime transport should be introduced for these requests. See the [official Vercel announcement](https://vercel.com/changelog/vercel-functions-now-support-request-bodies-up-to-20mib) and [payload troubleshooting requirements](https://vercel.com/docs/errors/function_payload_too_large).

No beta environment flag, paid memory setting, hosting project or public deployment was enabled by this work. An alternative Node host must also be tested with large multipart requests. If the chosen host cannot support the existing transport, direct private quarantine upload plus server validation is a separate implementation task; do not permit raw writes to ready evidence as a workaround.

## Preview smoke and promotion

1. Verify login/logout, resident/admin role redirects, and protected private routes while signed out.
2. Submit a fictional report with JPEG/PNG/WebP evidence. Exercise a near-limit batch through the actual public URL, follow-up uploads, invalid/spoofed files and the resident three-photo cap.
3. Review as admin, upload resolution evidence, and verify the resident's timeline and notifications. Check a second resident cannot read private reports, evidence or inbox records.
4. Publish only a separately authored safe summary; view anonymously, confirm/unconfirm as a resident, then unpublish. Check no private address, reporter or photo links appear publicly.
5. Check English/Filipino persistence, mobile widths, analytics and expired-photo refresh. Inspect response security/no-store headers through the actual CDN.
6. Promote only after saving the preview URL, actual outcomes and any limitations in the release record. Local Edge success alone does not verify Vercel's ingress/CDN behavior.

## Operations and recovery

- Run `npm.cmd run evidence:cleanup` from a trusted environment with the server key on a regular schedule. See [Phase 4 recovery](phase-4.md) for cancellation/grace-period behavior. Do not delete ready evidence manually to resolve an upload error.
- Monitor server errors, Supabase Auth failures, Storage quota, database size and response latency. Do not log credentials, session tokens, private form bodies or signed URLs.
- Keep a known-good application deployment and database backups according to the host/Supabase plan. Prefer application rollback; never drop tables or reverse migrations against live data as a routine rollback.
- If an upload failed after report creation, open the saved report and retry evidence there; do not resubmit the same issue. If status review conflicts, refresh and review the current official state before retrying.
- Use synthetic photos and fictional descriptions for demos. After a demo, unpublish its summaries; preserve official history unless an explicit retention/deletion process authorizes removal.

## Five-minute demonstration

Sign in as the demo resident, submit a fictional streetlight issue with one synthetic photo, and open its tracking detail. In a separate browser profile sign in as admin, accept it with an official note and publish a safe general summary. Return to the resident to show the notification and community confirmation. Resolve the report as admin, add resolution evidence, then show the resident's final history. Switch language and show the same screen at mobile width. Finish by removing the fictional summary from the public board.

Use credentials already configured locally; this document intentionally contains none. No new SQL migration is required for Phase 5.
