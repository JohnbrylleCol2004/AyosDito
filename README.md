# AyosDito

A bilingual barangay application built with Next.js App Router, TypeScript, Tailwind CSS and Supabase. **Phase 4 community features extend the Phase 1–3 foundation.**

Features include bilingual reporting/admin tracking, private validated evidence, explicitly moderated community summaries, affected-resident confirmations, private notifications and aggregate analytics. Apply the database/configuration steps in the [Phase 4 guide](docs/phase-4.md). Earlier setup remains documented in [Phase 2](docs/phase-2.md) and [Phase 3](docs/phase-3.md).

## 1. Run locally

Install Node.js **22.18 or newer** (a supported LTS version is recommended), then open PowerShell:

```powershell
Set-Location C:\AyosDito
npm.cmd ci
Copy-Item .env.example .env.local
```

Using `npm.cmd` avoids the Windows PowerShell restriction on `npm.ps1`. On macOS/Linux use `npm` instead.

Open `.env.local` in your editor and fill these values from **Supabase Dashboard → Project Settings → API** (the dashboard may also expose these under the Connect dialog):

```dotenv
NEXT_PUBLIC_SUPABASE_URL=<your-project-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_hFlNwCFPYYfBFyERkYIS1A_4xK0_M9u
```

Replace the angle-bracket descriptions with actual values. The publishable key is designed for the browser; access is still restricted by RLS. Never use a secret or service-role key as a `NEXT_PUBLIC_` value. `.env.local` is ignored by Git.

```powershell
npm.cmd run dev
```

Open **http://localhost:3000**. Before environment configuration, the app shows setup instructions. Restart the server after changing environment variables.

## 2. Configure Supabase

1. Create a fresh Supabase project and keep the database password private.
2. In **SQL Editor**, paste and run the entire file `supabase/migrations/202611220001_foundation.sql` once. It runs in a transaction; do not reapply it after success.
3. Under **Authentication → Providers / Sign In**, enable email/password authentication and turn off **Allow new users to sign up** for this controlled demo. There is no public registration screen.
4. Set **Authentication → URL Configuration → Site URL** to `http://localhost:3000` for local development. Set it to the actual HTTPS deployment URL for production. This Phase 1 uses password sign-in and needs no OAuth callback.
5. Verify that the five application tables have RLS enabled. The `report-photos` Storage bucket must be private.

The migration assumes a fresh project: it creates enums, tables, functions, policies, a sequence and a private bucket. If you prefer the Supabase CLI, initialize it locally with `npx supabase init`, then `npx supabase login`, `npx supabase link --project-ref <your-project-ref>` and `npx supabase db push`. Do not apply the SQL manually and push it again without reconciling migration history.

## 3. Create demo users

Use fictional names and email addresses under your control. Choose different emails and strong unique passwords of at least 12 characters. No passwords or account credentials are supplied in source code.

### Option A: Trusted local provisioning script

Temporarily fill these additional `.env.local` values:

```dotenv
SUPABASE_SECRET_KEY=<server-secret-key-from-supabase>
DEMO_RESIDENT_EMAIL=<resident-email>
DEMO_RESIDENT_PASSWORD=<resident-password>
DEMO_ADMIN_EMAIL=<admin-email>
DEMO_ADMIN_PASSWORD=<admin-password>
```

Quote passwords in the dotenv file if they contain spaces or `#`. Run once:

```powershell
npm.cmd run demo:users
```

The script creates confirmed Supabase Auth users. The database trigger creates their profiles as residents; the trusted script then assigns the administrator role through the privileged Supabase API. Role values from user-editable metadata are ignored. It does not print passwords or reset existing accounts.

Phase 4 also needs `SUPABASE_SECRET_KEY` in the **server-only** upload/cleanup worker. Never prefix it with `NEXT_PUBLIC_` or send it to the browser. Normal report operations and private reads still use the user JWT and public key. Remove demo credentials when finished with live tests; see the [Phase 4 configuration](docs/phase-4.md) for the upload key and deployment request-size requirements.

If provisioning partially succeeds, do not repeatedly rerun it: existing accounts are deliberately not overwritten. Create the missing user in the dashboard and assign the role using Option B. Do not delete existing accounts just to rerun a script.

### Option B: Supabase dashboard

Create two users via **Authentication → Users → Add user**, using your chosen credentials and auto-confirming their emails. Users created after the migration automatically receive resident profiles. Copy the intended administrator's UUID and run the following in the SQL Editor, replacing the UUID description:

```sql
update public.profiles
set full_name = 'Demo Administrator', role = 'admin', zone = 'Purok Demo'
where id = '<administrator-auth-user-uuid>'::uuid
returning id, full_name, role;
```

Keep the other account as `resident`. Assign roles only through this trusted SQL editor or a private provisioning process. An authenticated resident or administrator browser cannot update profile roles.

For accounts that existed **before** the migration, insert the missing profile explicitly:

```sql
insert into public.profiles (id, full_name, role, zone)
values ('<auth-user-uuid>'::uuid, 'Demo Resident', 'resident', 'Purok Demo');
```

## 4. Verify authentication and reporting

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

`npm test` uses Node's TypeScript support and an embedded PostgreSQL engine (PGlite). It executes the **actual migration**, with only Supabase-owned `auth`/`storage` scaffolding simulated. It checks resident isolation, admin reads, protected roles, ignored role metadata, unique confirmations, unique tracking numbers, blocked writes, private bucket configuration and RLS on all five tables. It does not emulate the hosted Auth or Storage services.

Run browser tests with Microsoft Edge installed:

```powershell
npm.cmd run test:e2e
```

The command loads `.env.local` and starts an isolated test server on port 3100 (override with `E2E_PORT`); stop another test server on that port first. Your normal development server on port 3000 can remain open because tests use `.next-e2e`. With demo credentials and all migrations, it verifies resident/admin authentication, resident reporting and official decisions. A complete suite creates four clearly labeled fictional reports: one resident report and three admin lifecycle/conflict fixtures. Tests requiring missing credentials are explicitly skipped. See [Phase 3 testing details](docs/phase-3.md). If Edge is unavailable, install it or select another installed browser in Playwright configuration.

For a hosted PostgreSQL check, run `supabase/tests/rls.sql` in the SQL Editor **of a test project** after applying the migration. Fictional fixtures are created inside a transaction and rolled back. If an assertion fails, roll back the failed transaction before continuing. Local SQL tests do not replace this hosted verification.

Manual acceptance checklist:

- Visiting `/dashboard` or `/admin` while signed out returns to `/login` (or `/setup` without configuration).
- Invalid email/password fields show translated messages. Incorrect credentials do not reveal whether an email exists.
- A resident signs into `/dashboard`; trying `/admin` returns them to their own dashboard.
- An administrator signs into `/admin`; their role comes from `profiles`, not form input or user metadata.
- Switching languages translates login labels, errors, navigation, statuses, account details and setup screens; the choice survives refresh and logout.
- Both dashboards show zero for a fresh database. If database permissions are broken, an error appears and counts become dashes rather than fabricated zeros.
- Signing out clears the local browser session. Reloading either protected route requires login.
- A missing profile shows an account support message without granting dashboard access.
- Residents submit/track reports and private photos; administrators manage official status/evidence and separately publish safe community summaries. Notifications and affected-resident confirmations follow database authorization.

## Invalid Project URL during demo creation or browser tests

Check `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`: it must be the full Supabase **Project URL**, normally `https://<project-ref>.supabase.co`, including `https://`. Copy it from the project's API settings or Connect dialog. Do not use the Supabase dashboard address, project reference alone, or an API key in this field. Set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` separately.

The app and browser tests share the same configuration validator. An invalid URL produces a safe warning, runs setup checks, and skips login/live-account checks. Passing setup checks does **not** verify Supabase connectivity or credentials. After correcting `.env.local`, restart your dev server and rerun `npm.cmd run test:e2e`. Never paste passwords or secret keys into chat or test output.

The demo-user script also checks the URL before contacting Supabase. If it reports `Invalid NEXT_PUBLIC_SUPABASE_URL`, correct that field and run `npm.cmd run demo:users` again. A URL validation failure creates no accounts. The Project URL is separate from the secret key and the publishable key; each belongs in its own environment variable.

## Important files

| File / folder                   | Purpose                                                                                                                            |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/`                      | App Router pages, global layout and styling. `/` redirects according to login and role.                                            |
| `src/lib/auth/`                 | Input validation, server actions and database-backed route authorization.                                                          |
| `src/lib/supabase/`             | Separate request-scoped server and browser clients; public environment checks.                                                     |
| `src/proxy.ts`                  | Refreshes verified Supabase sessions and propagates cookies and cache headers. Each protected page still authorizes independently. |
| `src/lib/i18n/`                 | Typed English/Filipino dictionaries and persistent language cookie.                                                                |
| `src/components/`               | Reusable accessible login, dashboard, navigation and setup components.                                                             |
| `supabase/migrations/`          | Versioned database structure, RLS and Storage configuration.                                                                       |
| `supabase/tests/rls.sql`        | Transactional SQL assertions for the actual database rules.                                                                        |
| `scripts/create-demo-users.mjs` | Trusted, explicit account provisioning; never imported by the application.                                                         |
| `tests/`                        | Authorization, translations, PostgreSQL security and browser workflow checks.                                                      |

## Security and future phases

All private pages render dynamically and Proxy sets private/no-store cache headers. Server Actions receive Next.js origin checks. Supabase supplies sign-in rate limits; configure appropriate limits in the Supabase dashboard before sharing a demo publicly. The application never uses a secret key for normal requests.

All application tables have RLS, including notifications. Residents read their own private records; administrators read authorized barangay records. Anonymous users access only explicitly moderated projections through the community RPC. Resident creation and admin lifecycle changes use controlled functions; raw report/audit writes and role edits remain forbidden. Notification recipients and confirmation identities come from the authenticated/database context. Raw private reports, locations and evidence are never publicly projected.

The private photo bucket stores server-decoded/re-encoded WebP evidence. Input is JPEG/PNG/WebP up to 5 MiB each, with three resident photos per report. Raw authenticated object writes remain denied; viewing requires authorized ready metadata and signed access. See [upload recovery and cleanup](docs/phase-4.md). There is no map, external messaging or multi-barangay scope in this delivery.

## Deployment preparation

Deployment belongs to Phase 5. The host must support the configured multipart upload size and server-only evidence key; review [Phase 4 limitations](docs/phase-4.md) before choosing the upload deployment transport. This workspace has not been deployed. Phase 5 requires your approval.

Official references: [Next.js Proxy](https://nextjs.org/docs/app/getting-started/proxy), [Supabase SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
