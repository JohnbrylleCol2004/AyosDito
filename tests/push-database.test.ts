import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("push queue is trusted-only, private, leased and idempotent", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
  create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  grant usage on schema auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;
  create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select on storage.objects to authenticated;`);
    const dir = new URL("../supabase/migrations/", import.meta.url);
    for (const file of (await readdir(dir))
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(await readFile(new URL(file, dir), "utf8"));
    const owner = "11111111-1111-4111-8111-111111111111",
      admin = "22222222-2222-4222-8222-222222222222";
    await db.exec(
      `insert into auth.users(id) values('${owner}'),('${admin}');update public.profiles set approval_status='approved';update public.profiles set role='admin' where id='${admin}';set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false);`,
    );
    const key = Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 7)]).toString(
        "base64url",
      ),
      auth = Buffer.alloc(16, 8).toString("base64url");
    const sub = (
      await db.query<{ id: string }>(
        `select public.save_push_subscription($1,$2,$3) id`,
        ["https://fcm.googleapis.com/fcm/send/example", key, auth],
      )
    ).rows[0].id;
    assert.equal(
      (
        await db.query<{ id: string }>(
          `select public.save_push_subscription($1,$2,$3) id`,
          ["https://fcm.googleapis.com/fcm/send/example", key, auth],
        )
      ).rows[0].id,
      sub,
    );
    await assert.rejects(
      db.query(`select public.save_push_subscription($1,$2,$3)`, [
        "https://127.0.0.1/internal",
        key,
        auth,
      ]),
    );
    await assert.rejects(db.query("select public.claim_push_deliveries(10)"));
    const report = (
      await db.query<{ id: string }>(
        `select public.create_report(p_title=>'Push test report',p_description=>'Fictional push queue report details.',p_category=>'other',p_zone=>'Test',p_location_details=>null,p_submission_key=>gen_random_uuid()) id`,
      )
    ).rows[0].id;
    await db.exec(
      `select set_config('request.jwt.claim.sub','${admin}',false);`,
    );
    await db.query(
      `select public.transition_report($1,'in_progress','Fictional acceptance.',0)`,
      [report],
    );
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select count(*)::int n from public.push_subscriptions",
        )
      ).rows[0].n,
      0,
    );
    await db.exec(`reset role;set role service_role;`);
    const first = (
      await db.query<{ batch: { id: string; lease: string }[] }>(
        "select public.claim_push_deliveries(10) batch",
      )
    ).rows[0].batch;
    assert.equal(first.length, 1);
    assert.deepEqual(
      (
        await db.query<{ batch: unknown[] }>(
          "select public.claim_push_deliveries(10) batch",
        )
      ).rows[0].batch,
      [],
    );
    await db.query("select public.complete_push_delivery($1,$2,true,false)", [
      first[0].id,
      "99999999-9999-4999-8999-999999999999",
    ]);
    await db.query("select public.complete_push_delivery($1,$2,true,false)", [
      first[0].id,
      first[0].lease,
    ]);
    await db.exec("reset role");
    assert.equal(
      (
        await db.query<{ state: string }>(
          "select state from public.push_deliveries",
        )
      ).rows[0].state,
      "sent",
    );
    await db.exec(
      `set role authenticated;select set_config('request.jwt.claim.sub','${admin}',false);`,
    );
    const transferred = (
      await db.query<{ id: string }>(
        "select public.save_push_subscription($1,$2,$3) id",
        ["https://fcm.googleapis.com/fcm/send/example", key, auth],
      )
    ).rows[0].id;
    assert.notEqual(transferred, sub);
    assert.equal(
      (
        await db.query<{ ok: boolean }>(
          "select public.owns_push_subscription($1) ok",
          [sub],
        )
      ).rows[0].ok,
      false,
    );
    await db.exec("reset role");
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select count(*)::int n from public.push_deliveries",
        )
      ).rows[0].n,
      0,
    );
    await db.exec(
      `update public.profiles set approval_status='pending' where id='${owner}';set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false);`,
    );
    assert.equal(
      (
        await db.query<{ ok: boolean }>(
          "select public.owns_push_subscription($1) ok",
          [sub],
        )
      ).rows[0].ok,
      false,
    );
    await assert.rejects(
      db.query(`select public.save_push_subscription($1,$2,$3)`, [
        "https://fcm.googleapis.com/fcm/send/other",
        key,
        auth,
      ]),
    );
    const events = await db.query<{ recipient_id: string }>(
      "select recipient_id from public.live_events",
    );
    assert.deepEqual(
      events.rows.map((item) => item.recipient_id),
      [owner],
    );
    await assert.rejects(
      db.query("update public.live_events set version=version+1"),
    );
  } finally {
    await db.close();
  }
});
