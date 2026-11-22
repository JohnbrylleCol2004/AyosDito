import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("evidence reservations, slots, trusted completion and private Storage reads enforce permissions", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
      create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text); alter table storage.objects enable row level security;
      grant usage on schema storage to authenticated; grant select on storage.objects to authenticated;`);
    for (const name of [
      "202611220001_foundation",
      "202611230001_reporting",
      "202611230002_reporting_hardening",
      "202611230003_admin_management",
      "202611230004_legacy_report_review",
      "202611230005_explicit_review_conflicts",
      "202611230006_evidence",
    ]) {
      await db.exec(
        await readFile(
          new URL(`../supabase/migrations/${name}.sql`, import.meta.url),
          "utf8",
        ),
      );
    }
    await db.exec(
      await readFile(
        new URL("../supabase/tests/evidence.sql", import.meta.url),
        "utf8",
      ),
    );
  } finally {
    await db.close();
  }
});
