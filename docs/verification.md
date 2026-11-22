# Phase 1 verification — 2026-11-22

## Follow-up: E2E configuration mismatch — 2026-11-23

- Reproduced the reported failure: tests expected `/login` while the application correctly redirected to `/setup`.
- Safe diagnostics confirmed that the URL variable was nonempty but was not a valid HTTP(S) URL; no environment values were printed or modified.
- Browser tests now reuse the application's `supabaseConfig()` validation instead of checking only whether values are present. The runner gives a configuration warning with no secret values.
- With the unchanged invalid configuration, Edge reported **2 passed, 2 skipped**. Skipped login/live-account tests remain unverified until the Project URL is corrected.
- Seven Node tests, ESLint and TypeScript passed. The additional regression check covers malformed URLs, unsupported protocols, valid hosted/local URLs and missing keys.
- See the README troubleshooting section for correcting the Project URL locally.

## Executed locally

- Production build: passed with Next.js 16.4.6, React 19.3.1 and Supabase SSR 0.12.7.
- ESLint and TypeScript: passed after fixing the initial error-boundary language implementation to use context.
- Six Node tests: passed, including execution of the actual SQL migration and security assertions in embedded PostgreSQL.
- Edge, unconfigured app: setup instructions, English/Filipino persistence and protected route redirects passed.
- Edge, public test configuration without a running Supabase service: login validation, translated field errors, protected route redirects and viewport overflow checks passed at 1440, 1024, 768, 390 and 320 pixels. No authentication success was simulated.
- Desktop and mobile login screenshots were inspected visually.
- An independent read-only code reviewer found no Critical or Important issues. Minor logout-scope and documentation findings were addressed.

The browser suites intentionally skip the live account test without Supabase credentials. They also skip setup-only checks when public configuration is present, and login checks when configuration is absent. A temporary non-secret test URL/key was used only to render the login and validate empty form submissions; it is not saved as application configuration.

## Still requires your Supabase project

- Applying the migration to hosted Supabase and running `supabase/tests/rls.sql` there.
- Creating demo users and testing actual password sign-in, refresh, logout and both authenticated dashboard layouts.
- Live resident/admin browser test, including authenticated language persistence and resident denial at the admin URL.
- Manually verifying incorrect credentials, a genuinely expired session, missing profiles and hosted Storage access denial.
- Vercel deployment and validation on its HTTPS origin.

PGlite runs real PostgreSQL but simulates Supabase-owned Auth/Storage schemas; its passing tests cannot prove hosted Auth or Storage integration. No live project credentials were available in this workspace. No deployment or Phase 2 work has been performed.

## Environment findings

- PowerShell blocks `npm.ps1`; `npm.cmd` works without changing execution policy.
- The initial `tsx` runner failed on sandboxed Windows user lookup (`uv_os_get_passwd`); tests now use Node's built-in TypeScript support, removing that dependency.
- Docker's daemon is unavailable, so PostgreSQL checks use PGlite and a separately runnable hosted SQL test.
- Browser tests required permission to launch and terminate their own Edge/server processes. Test runner warnings about `NO_COLOR`/`FORCE_COLOR` were informational.
