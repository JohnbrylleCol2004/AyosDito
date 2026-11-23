import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("resident approval survives forged metadata and enforces RPC/table boundaries", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
      create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text); alter table storage.objects enable row level security;
      grant usage on schema storage to authenticated; grant select on storage.objects to authenticated;`);
    const dir = new URL("../supabase/migrations/", import.meta.url);
    const migrations = (await readdir(dir))
      .filter((name) => name.endsWith(".sql") && name < "202611240010")
      .sort();
    for (const name of migrations)
      await db.exec(await readFile(new URL(name, dir), "utf8"));
    const admin = "11111111-1111-4111-8111-111111111111",
      old = "22222222-2222-4222-8222-222222222222",
      pending = "33333333-3333-4333-8333-333333333333",
      rejected = "44444444-4444-4444-8444-444444444444";
    await db.exec(
      `insert into auth.users(id) values('${admin}'),('${old}'); update public.profiles set role='admin' where id='${admin}';`,
    );
    await db.exec(
      await readFile(
        new URL("202611240010_resident_approval.sql", dir),
        "utf8",
      ),
    );
    assert.equal(
      (
        await db.query<{ approval_status: string }>(
          `select approval_status from public.profiles where id=$1`,
          [old],
        )
      ).rows[0].approval_status,
      "approved",
    );
    await db.exec(
      `insert into auth.users(id,raw_user_meta_data) values('${pending}','{"role":"admin","approval_status":"approved","full_name":"Resident","zone":"North"}'),('${rejected}','{}');`,
    );
    assert.deepEqual(
      (
        await db.query(
          `select role::text,approval_status from public.profiles where id=$1`,
          [pending],
        )
      ).rows[0],
      { role: "resident", approval_status: "pending" },
    );
    const as = async (id: string, role = "authenticated") =>
      db.exec(
        `reset role; set role ${role}; select set_config('request.jwt.claim.sub','${id}',false);`,
      );
    const create = () =>
      db.query<{ create_report: string }>(
        `select public.create_report('Broken streetlight','streetlight','A streetlight has been broken for several nights.','North',null,gen_random_uuid())`,
      );
    await as(pending);
    assert.equal(
      (await db.query(`select * from public.profiles`)).rows.length,
      1,
    );
    await assert.rejects(create());
    await assert.rejects(
      db.query(
        `update public.profiles set approval_status='approved' where id=$1`,
        [pending],
      ),
    );
    await assert.rejects(
      db.query(`select public.review_resident($1,true,null)`, [pending]),
    );
    await as(admin);
    await assert.rejects(
      db.query(`select public.review_resident($1,true,null)`, [admin]),
    );
    await db.query(
      `select public.review_resident($1,true,'Verified at office')`,
      [pending],
    );
    await assert.rejects(
      db.query(
        `select public.review_resident($1,false,'Stale second review')`,
        [pending],
      ),
    );
    await db.query(`select public.review_resident($1,false,'Contact office')`, [
      rejected,
    ]);
    await as(pending);
    const report = (await create()).rows[0].create_report;
    const resolved = (await create()).rows[0].create_report;
    await db.query(
      `select public.reserve_evidence($1,'report',gen_random_uuid())`,
      [report],
    );
    await as(admin);
    await db.query(
      `select public.transition_report($1,'in_progress','Repair assigned',0)`,
      [resolved],
    );
    await db.query(
      `select public.transition_report($1,'resolved','Repair completed',1)`,
      [resolved],
    );
    await db.query(
      `select public.transition_report($1,'in_progress','Repair assigned',0)`,
      [report],
    );
    await db.query(
      `select public.set_report_publication($1,true,'Broken streetlight','A streetlight needs repair in this zone.','North',true)`,
      [report],
    );
    // Simulate a trusted account suspension to test existing owned resources.
    await db.exec(
      `reset role; update public.profiles set approval_status='pending' where id='${pending}';`,
    );
    await as(pending);
    await assert.rejects(create());
    await assert.rejects(
      db.query(`select public.set_report_confirmation($1,true)`, [report]),
    );
    await assert.rejects(
      db.query(
        `select public.reserve_evidence($1,'report',gen_random_uuid())`,
        [report],
      ),
    );
    await assert.rejects(
      db.query(`select public.save_report_location($1,14.5,121.0)`, [report]),
    );
    await assert.rejects(
      db.query(`select public.save_report_feedback($1,5,'Good work')`, [
        resolved,
      ]),
    );
    await assert.rejects(
      db.query(
        `select public.request_report_reopen($1,'The issue is recurring')`,
        [resolved],
      ),
    );
    assert.equal(
      (
        await db.query<{ is_approved_resident: boolean }>(
          `select public.is_approved_resident()`,
        )
      ).rows[0].is_approved_resident,
      false,
    );
    assert.equal(
      (await db.query(`select * from public.reports`)).rows.length,
      0,
    );
    await as(rejected);
    await assert.rejects(create());
    await as("", "anon");
    await assert.rejects(
      db.query(`select public.review_resident($1,true,null)`, [rejected]),
    );
  } finally {
    await db.close();
  }
});
