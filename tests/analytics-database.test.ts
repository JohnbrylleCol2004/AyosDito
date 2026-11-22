import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("analytics aggregates real monthly/zone data and never invents resolution averages", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select on storage.objects to authenticated;`,
    );
    for (const name of [
      "202611220001_foundation",
      "202611230001_reporting",
      "202611230002_reporting_hardening",
      "202611230003_admin_management",
      "202611230004_legacy_report_review",
      "202611230005_explicit_review_conflicts",
      "202611230006_evidence",
      "202611230007_engagement",
      "202611230008_analytics",
    ])
      await db.exec(
        await readFile(
          new URL(`../supabase/migrations/${name}.sql`, import.meta.url),
          "utf8",
        ),
      );
    await db.exec(`begin;insert into auth.users(id) values('a9999999-9999-4999-8999-999999999991'),('a9999999-9999-4999-8999-999999999992');update public.profiles set role='admin' where id='a9999999-9999-4999-8999-999999999992';set local role authenticated;select set_config('request.jwt.claim.sub','a9999999-9999-4999-8999-999999999991',true);do $$begin begin perform public.admin_community_analytics();raise exception 'Resident accessed analytics';exception when insufficient_privilege then null;end;end$$;select set_config('request.jwt.claim.sub','a9999999-9999-4999-8999-999999999992',true);do $$declare result jsonb;begin result:=public.admin_community_analytics();assert jsonb_array_length(result->'months')=12;assert jsonb_array_length(result->'zones')=0;assert result->'average_resolution_hours'='null'::jsonb;end$$;reset role;
 insert into public.reports(reporter_id,title,description,category,zone,status,created_at) select 'a9999999-9999-4999-8999-999999999991','Analytics fixture','Fictional analytics test report.','other','Zone Demo','resolved',now()-interval '2 hours' from generate_series(1,3);
 insert into public.report_updates(report_id,admin_id,old_status,new_status,note,created_at) select id,'a9999999-9999-4999-8999-999999999992','in_progress','resolved','Fictional completion.',created_at+interval '2 hours' from public.reports;
 set local role authenticated;select set_config('request.jwt.claim.sub','a9999999-9999-4999-8999-999999999992',true);do $$declare result jsonb;begin result:=public.admin_community_analytics();assert (result->>'resolution_samples')::int=3;assert (result->>'average_resolution_hours')::numeric=2;assert (result->'zones'->0->>'count')::int=3;assert (select sum((value->>'count')::int) from jsonb_array_elements(result->'months'))=3;end$$;reset role;rollback;`);
  } finally {
    await db.close();
  }
});
