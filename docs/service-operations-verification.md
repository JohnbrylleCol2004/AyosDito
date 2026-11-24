# Service operations verification — November 24, 2026

## Evidence collected

Final `npm.cmd run release:check -- --browser` completed successfully: **66 local tests passed**, production builds/TypeScript/ESLint/formatting passed, and **16 production Edge tests passed with2 intentional environment-specific skips** (2.5minutes). The skips were development-only forwarding and unconfigured installation. Known server/demo/VAPID/job-secret values were not found in browser JavaScript/source maps.

- The actual migrations execute in disposable PostgreSQL (PGlite) and cover approved/pending/rejected roles, ignored forged metadata, protected writes, internal-note privacy, stale versions, duplicate cycles, reopen review/audit rollback, coordinate privacy, aggregate authorization, push ownership/leases and recipient-only invalidations.
- Local contrast tests cover 24 foreground/background/control/status pairs. Fresh Edge visual checks cover public login/register/install/recovery at320/390/768/1440px, Filipino, visible focus and reduced motion; sampled public text contrast was at least5.99:1. Authenticated resident/admin pages were also inspected at320/390/1440px after hosted setup. One missing operations-panel gap was corrected.
- Official Impeccable skill was installed from `pbakaus/impeccable` into ignored `.superpowers/skills/impeccable`, its context/craft guidance used, and the final changed-file detector run once. It reported no errors and one advisory about the incumbent Arial font, retained for this Operate-mode refinement. The helper screenshot transport failed; installed Edge supplied actual fresh visual checks instead.
- English/Filipino monthly PDF fixtures were rendered and visually checked. Local map browser fixtures confirmed zero map containers/OSM requests before explicit consent and tile requests only afterward; fixture tiles avoided contacting the real tile service.
- VAPID signing and payload encryption were exercised locally without sending a push request. Generic push rendering tests verify session authorization and ignore supplied report titles/external links. No actual device permission, provider delivery or scheduler was tested or enabled.

## Hosted checks

Migrations009–012 were confirmed available through hosted readiness/profile/RPC probes after the owner applied them. A production Edge integration case passed using a newly created fictional confirmed resident and two fictional reports. It verified:

1. Forged admin/approved metadata still produces a pending resident, with report creation denied.
2. Admin approval through the UI and automatic resident redirect through a real Realtime event, within20seconds rather than the30-second polling fallback.
3. Assignment, stale-write conflict, overdue target metadata, private-note isolation and duplicate-cycle denial.
4. Exact private location denied anonymously; public projection uses rounded coordinates and separately authored safe text.
5. Authenticated monthly CSV and PDF responses, no-store headers, feedback and reviewed reopening.
6. Official audit retained, public summary/pin hidden after reopening, and no internal note shown to the resident.

This fixture uses trusted Auth test provisioning with email already confirmed, so it does **not** prove delivery of confirmation/recovery email. Real SMTP, redirect allowlists and production email-provider limits still require acceptance using the owner's own addresses.

The service integration test checks cleanup errors and deletes only its own two fictional reports and temporary account. Earlier Phase 1–4 browser tests retain their previously documented labeled fictional fixtures; this run did not delete or review real resident submissions.

## Defects caught during testing

- Initial Realtime channel join could happen without the browser's existing SSR session token, causing an anonymous filter rejection. The component now awaits its cookie-backed session and explicitly authenticates Realtime before subscribing.
- `SUBSCRIBED` can precede PostgreSQL replication readiness. The UI now waits for the database `system` ready event and refreshes then to reconcile startup-window changes. Independent live SDK probes verified the same timing gap and filtered authenticated delivery.
- Subscription ownership transfer initially preserved an old identifier/queue. It now rotates the identifier and deletes prior queued deliveries, so delayed shared-device payloads fail authorization.
- Private-row Realtime publication was replaced with generic per-recipient events because DELETE events do not apply normal row-level filtering. The published table has random primary keys and no report content/entity identifiers.
- Missing `SITE_URL` caused registration/recovery configuration errors. The local setting is configured and the resolver supports Vercel's trusted production-domain fallback, while rejecting request-header/preview origins and malformed destinations.
- Signup cleanup could delete the SDK's PKCE verifier before email confirmation. It now signs out only automatic signup sessions; SDK-backed tests cover preservation and cleanup. Callback handling forwards a validated per-flow identifier. Authentication lookup is memoized only within the current React render pass to reduce repeated private-page database reads.

## Release boundaries

No Git push or Vercel deployment was performed by the agent. The owner may separately publish commits while work is in progress; the current Vercel environment and final commit still need to be checked before calling the public release complete. Existing application migration files must not be rerun blindly.

Use `docs/service-operations.md` for the four migration names, canonical `SITE_URL`, Supabase email settings, private push configuration and scheduler instructions. Installed-app behavior still depends on HTTPS/browser support. Private reports/evidence remain outside the service-worker cache. The existing provider upload-size requirements are unchanged.
