import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("admin RPC enforces lifecycle, stale conflicts, identity, atomic audit and privacy", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create schema auth; create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
      grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
      create schema storage; create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    `);
    for (const path of [
      "migrations/202611220001_foundation.sql",
      "migrations/202611230001_reporting.sql",
      "migrations/202611230002_reporting_hardening.sql",
      "migrations/202611230003_admin_management.sql",
      "migrations/202611230004_legacy_report_review.sql",
      "migrations/202611230005_explicit_review_conflicts.sql",
      "tests/admin.sql",
    ]) {
      await db.exec(
        await readFile(new URL("../supabase/" + path, import.meta.url), "utf8"),
      );
      if (path === "migrations/202611220001_foundation.sql") {
        await db.exec(
          `insert into auth.users(id) values ('e4444444-4444-4444-8444-444444444444'); insert into public.reports(id,reporter_id,title,description,category,zone,location_details) values ('f4444444-4444-4444-8444-444444444444','e4444444-4444-4444-8444-444444444444',repeat('x',130),'1234567890','other','Legacy',repeat('x',220));`,
        );
      }
    }
    await db.exec(
      await readFile(
        new URL("../supabase/tests/admin-legacy.sql", import.meta.url),
        "utf8",
      ),
    );
  } finally {
    await db.close();
  }
});
