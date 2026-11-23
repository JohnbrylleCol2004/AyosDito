# Service operations, real resident accounts and interface update

## What changed

- Admin assignment to a responsible administrator/office, target dates, overdue/due-today/unassigned counts, private internal notes and version conflict handling.
- Resident feedback after resolution and a reasoned reopen request. An administrator reviews the request; approval creates an official resolved-to-in-progress audit event and removes the old public summary. Old history is retained.
- Admin duplicate-report linking with self/cycle prevention. Other residents cannot inspect the linked private report.
- Monthly admin CSV and PDF exports, using Philippine month boundaries. CSV neutralizes spreadsheet formulas and pages up to 5,000 records; larger months return an actionable error. PDF is an aggregate summary with no private reporter names.
- Optional private coordinate pin and separately authored approximate public pin. Public pins are rounded to two decimal degrees (roughly kilometre scale); private coordinates never prefill the public editor. Loading map tiles requires an explicit action and shares the viewed area/IP with OpenStreetMap; coordinates can be entered without loading a map. The public map projection is capped at 200 published issues.
- Resident self-registration, password recovery, email callbacks, administrator approval/rejection and a pending-account screen. Existing profiles retain access. New profiles are always residents/pending regardless of client metadata. Pending/rejected accounts cannot use report/evidence/confirmation workflows through direct RPC calls either.
- Authenticated live refresh through generic per-recipient events. Private report/profile rows are not published. The header reports connection state; reconnect/focus/30-second recovery covers lost or unavailable Realtime. Refresh is deferred while a text/select field is being edited.
- Optional device push alerts with consent, generic encrypted payloads, leased retries and a current-account check before displaying on shared devices. Ten subscriptions per account maximum. Switching subscription ownership rotates its identifier and discards old queued deliveries.
- Official Impeccable-guided refinement: stronger text/form/status contrast, clear focus, larger controls, quieter hierarchy, compact mobile navigation and purposeful reduced-motion-safe feedback. Existing green map-pin identity and English/Filipino support are retained. No fake activity counters or gamification was added.

## Database setup (before deploying this code)

In the existing Supabase project's SQL Editor, apply only these new files in order:

1. `supabase/migrations/202611240009_service_operations.sql`
2. `supabase/migrations/202611240010_resident_approval.sql`
3. `supabase/migrations/202611240011_push_realtime.sql`
4. `supabase/migrations/202611240012_live_event_privacy.sql`

Do not rerun Phase 1–4 migrations. Files 009–012 create new structures/functions and 010 preserves existing accounts as approved. The fourth file also hardens earlier011 rollouts. The registration action refuses to call Auth sign-up until the final registration-readiness RPC is present, preventing users created against an old schema from bypassing approval during deployment.

For Realtime, the normal Supabase `supabase_realtime` publication must exist. Migration012 adds only `live_events` and removes these app's private profile/report/workflow tables if they were previously published. It preserves unrelated publication tables/settings. If Realtime is disabled or the publication is absent, focus/interval refresh still works; do not call that a verified live subscription.

If a newly created RPC returns `PGRST202` after successful SQL application, reload the PostgREST schema (`notify pgrst, 'reload schema';`) and retry. Do not blindly reapply every migration.

## Real resident accounts

Set `SITE_URL=https://ayosdito.vercel.app` in Vercel production environment variables (or your actual canonical HTTPS domain). It is a fixed trusted email destination, never derived from arbitrary forwarded headers. Configure Supabase Auth:

- Allow email/password sign-ups; use email confirmation for the recommended verified-email workflow.
- Set the Auth Site URL to the same canonical site and allow `/auth/callback` and `/auth/callback?next=/auth/reset-password` redirect URLs there. A token-hash `/auth/confirm` route is also supported for customized templates.
- Configure and test production SMTP, sender address, rate limits and recovery emails. No email-provider setting was changed by this implementation.

A resident signs up with name, zone, email, matching passwords of 12–128 characters, confirms email when required, and signs in to the pending screen. An existing approved administrator opens **Resident approvals** and approves/rejects with an optional internal note. The pending page listens for its own update and refreshes into the appropriate state; a refresh control/fallback remains available.

Residents cannot request an admin role. Trusted admin provisioning remains separate. Existing demo accounts are still useful as test fixtures but are no longer the only account flow. Do not publish fixture passwords or the server key.

## Push setup

Missing local push configuration was generated privately in ignored `.env.local`. Its values were not printed. To generate missing values on another development machine while preserving an existing complete key pair:

```powershell
npm.cmd run push:keys -- --write-env
```

Copy the following values privately into Vercel, preserving the same key pair across deployments:

| Name                           | Purpose                                                  |
| ------------------------------ | -------------------------------------------------------- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public browser subscription key, available at build time |
| `VAPID_PRIVATE_KEY`            | Server-only signing key                                  |
| `VAPID_SUBJECT`                | HTTPS contact URL or administrator `mailto:` URL         |
| `PUSH_CRON_SECRET`             | Server-only random delivery-job secret                   |
| `SUPABASE_SECRET_KEY`          | Existing server-only trusted queue worker key            |

After deployment, an approved user explicitly enables push on the Notifications page and grants browser permission. Browser/platform support varies; an installed app may be required. Account switching cannot authorize another account's delayed alerts. Notifications contain only a generic AyosDito message and always open `/notifications`; the actual records still require authentication and RLS.

Configure a trusted scheduler, within the host plan's capabilities, to call `POST /api/push/deliver` with `Authorization: Bearer <PUSH_CRON_SECRET>`. GET is also supported for schedulers. The endpoint claims at most ten deliveries, uses expiring leases, retries failures at most five times and removes expired subscriptions. Delivery is at least once; stable notification tags help suppress visible duplicates after ambiguous retries. No scheduler, paid host setting or real device delivery was created/tested automatically.

To explicitly run one delivery batch from a trusted local environment after setting `SITE_URL` and the production job secret:

```powershell
npm.cmd run push:deliver
```

Without a scheduler or manual delivery batch, queued notifications remain in-app/queued; push is not magically instant. Do not rotate VAPID keys casually, because existing browser subscriptions depend on the public key.

## Publishing and acceptance

Apply the SQL and environment/Auth settings first, then deploy the updated repository to Vercel. No deployment or Git push is performed by this work. Existing photo-ingress requirements remain unchanged.

On the actual HTTPS site, verify new resident signup/email confirmation, pending access denial, admin approval, existing-account login, assignment/conflicts/overdue, feedback/reopen audit, duplicate privacy, CSV/PDF exports, private/public pin separation, optional tile loading, live approval/status updates and opt-in push delivery. Test Android PWA and desktop widths, keyboard navigation and Filipino. SMTP delivery, actual push transport, and hosted Realtime require this live acceptance; local mocks or SQL tests cannot prove them.

See `docs/service-operations-verification.md` for executed checks and remaining hosted prerequisites.
