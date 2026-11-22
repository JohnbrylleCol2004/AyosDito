import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("real PostgreSQL enforces the migration and resident/admin isolation", async () => {
  const db = new PGlite();
  try {
    // Only Supabase-owned schemas are simulated. All application tables, triggers,
    // grants and RLS policies come from the unmodified production migration.
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as
        $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
      grant usage on schema auth to authenticated;
      grant execute on function auth.uid() to authenticated;
      create schema storage;
      create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    `);
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202611220001_foundation.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL("../supabase/tests/rls.sql", import.meta.url),
        "utf8",
      ),
    );
  } finally {
    await db.close();
  }
});
