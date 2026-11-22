import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("engagement RPCs keep private fields sealed, confirmations idempotent and notifications transactional", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create schema auth; create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
      create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
    for (const name of [
      "202611220001_foundation",
      "202611230001_reporting",
      "202611230002_reporting_hardening",
      "202611230003_admin_management",
      "202611230004_legacy_report_review",
      "202611230005_explicit_review_conflicts",
      "202611230007_engagement",
    ]) {
      await db.exec(
        await readFile(
          new URL(`../supabase/migrations/${name}.sql`, import.meta.url),
          "utf8",
        ),
      );
    }
    const admin = "11111111-1111-4111-8111-111111111111";
    const resident = "22222222-2222-4222-8222-222222222222";
    const other = "33333333-3333-4333-8333-333333333333";
    const report = "44444444-4444-4444-8444-444444444444";
    await db.exec(`insert into auth.users(id) values('${admin}'),('${resident}'),('${other}'); update public.profiles set role='admin' where id='${admin}';
      insert into public.reports(id,reporter_id,title,description,category,zone,location_details) values('${report}','${resident}','PRIVATE TITLE','PRIVATE DESCRIPTION LONG ENOUGH','road','PRIVATE ZONE','PRIVATE EXACT ADDRESS');`);
    const as = async (id: string, role = "authenticated") => {
      await db.exec(
        `reset role; set role ${role}; select set_config('request.jwt.claim.sub','${id}',false);`,
      );
    };
    await as(admin);
    await assert.rejects(
      db.query(
        `select public.set_report_publication($1,true,'Public road','A safe public summary of the road','North',true)`,
        [report],
      ),
    );
    await db.query(
      `select public.transition_report($1,'in_progress','Admin private note',0)`,
      [report],
    );
    await assert.rejects(
      db.query(
        `select public.set_report_publication($1,true,'Public road','A safe public summary of the road','North',false)`,
        [report],
      ),
    );
    await db.query(
      `select public.set_report_publication($1,true,'Public road','A safe public summary of the road','North',true)`,
      [report],
    );
    await as(other);
    await assert.rejects(
      db.query(
        `select public.set_report_publication($1,true,'Public road','A safe public summary of the road','North',true)`,
        [report],
      ),
    );
    await db.query(`select public.set_report_confirmation($1,true)`, [report]);
    await db.query(`select public.set_report_confirmation($1,true)`, [report]);
    const rows = (
      await db.query<Record<string, unknown>>(
        `select * from public.community_reports()`,
      )
    ).rows;
    assert.equal(rows[0].confirmation_count, 1);
    assert.equal(rows[0].viewer_confirmed, true);
    assert.equal(JSON.stringify(rows).includes("PRIVATE"), false);
    assert.deepEqual(
      Object.keys(rows[0]).sort(),
      [
        "id",
        "public_title",
        "public_summary",
        "public_zone",
        "category",
        "status",
        "confirmation_count",
        "viewer_confirmed",
        "total_count",
      ].sort(),
    );
    assert.equal(
      (await db.query(`select * from public.community_reports('%')`)).rows
        .length,
      0,
    );
    await as("", "anon");
    assert.equal(
      (await db.query(`select * from public.community_reports()`)).rows.length,
      1,
    );
    await assert.rejects(db.query(`select * from public.reports`));
    await assert.rejects(db.query(`select * from public.report_confirmations`));
    await as(admin);
    await db.query(
      `select public.set_report_publication($1,false,null,null,null,false)`,
      [report],
    );
    await as(other);
    await assert.rejects(
      db.query(`select public.set_report_confirmation($1,true)`, [report]),
    );
    await db.query(`select public.set_report_confirmation($1,false)`, [report]);
    assert.equal(
      (await db.query(`select * from public.community_reports()`)).rows.length,
      0,
    );
    assert.equal(
      (await db.query(`select * from public.notifications`)).rows.length,
      0,
    );
    await assert.rejects(
      db.query(`insert into public.notifications default values`),
    );
    await as(resident);
    const notifications = (
      await db.query<{ id: string; title_key: string; message_key: string }>(
        `select * from public.notifications`,
      )
    ).rows;
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].message_key, "in_progress");
    await as(other);
    await db.query(`select public.mark_notifications_read($1)`, [
      notifications[0].id,
    ]);
    await as(resident);
    assert.equal(
      (
        await db.query<{ is_read: boolean }>(
          `select is_read from public.notifications`,
        )
      ).rows[0].is_read,
      false,
    );
    await assert.rejects(
      db.query(`update public.notifications set is_read=true`),
    );
    await db.query(`select public.mark_notifications_read($1)`, [
      notifications[0].id,
    ]);
    assert.equal(
      (
        await db.query<{ is_read: boolean }>(
          `select is_read from public.notifications`,
        )
      ).rows[0].is_read,
      true,
    );
    await db.exec(`reset role; create function public.fail_notification() returns trigger language plpgsql as $$begin raise exception 'test failure'; end$$;
      create trigger test_fail before insert on public.notifications for each row execute function public.fail_notification();`);
    await as(admin);
    await assert.rejects(
      db.query(
        `select public.transition_report($1,'resolved','Work completed',1)`,
        [report],
      ),
    );
    assert.equal(
      (
        await db.query<{ status: string }>(
          `select status from public.reports where id=$1`,
          [report],
        )
      ).rows[0].status,
      "in_progress",
    );
    assert.equal(
      (
        await db.query(
          `select * from public.report_updates where report_id=$1`,
          [report],
        )
      ).rows.length,
      1,
    );
    await db.exec(
      `reset role; drop trigger test_fail on public.notifications;`,
    );
    await as(admin);
    await db.query(
      `select public.transition_report($1,'resolved','Completed safely',1)`,
      [report],
    );
    await as(resident);
    assert.equal(
      (await db.query(`select * from public.notifications`)).rows.length,
      2,
    );
    await db.query(`select public.mark_notifications_read()`);
    assert.equal(
      (await db.query(`select * from public.notifications where not is_read`))
        .rows.length,
      0,
    );
    await db.exec(`reset role;
      insert into public.reports(reporter_id,title,description,category,zone,status,is_public,public_title,public_summary,public_zone,created_at)
      select '${resident}','Private road','A private description with detail','road','PRIVATE','resolved',true,'Published road '||n,'Safe community summary for the road','South',now()+n*interval '1 second' from generate_series(1,13) n;`);
    await as("", "anon");
    const first = (
      await db.query<{ total_count: number; public_title: string }>(
        `select * from public.community_reports('','road','South','resolved')`,
      )
    ).rows;
    assert.equal(first.length, 12);
    assert.equal(first[0].total_count, 13);
    assert.equal(first[0].public_title, "Published road 13");
    assert.equal(
      (
        await db.query(
          `select * from public.community_reports('','road','South','resolved','newest',2)`,
        )
      ).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          `select * from public.community_reports('','road','South','in_progress')`,
        )
      ).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
