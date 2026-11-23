import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("operations enforce role privacy, versions, acyclic duplicates and reviewed reopen audit", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
 create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
 create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid,bucket_id text,name text); alter table storage.objects enable row level security;`);
    const migrations = await readdir(
      new URL("../supabase/migrations/", import.meta.url),
    );
    for (const name of migrations
      .filter((n) => n.endsWith(".sql") && n < "202611240010")
      .sort())
      await db.exec(
        await readFile(
          new URL(`../supabase/migrations/${name}`, import.meta.url),
          "utf8",
        ),
      );
    const admin = "11111111-1111-4111-8111-111111111111",
      owner = "22222222-2222-4222-8222-222222222222",
      other = "33333333-3333-4333-8333-333333333333";
    const a = "44444444-4444-4444-8444-444444444444",
      b = "55555555-5555-4555-8555-555555555555",
      c = "66666666-6666-4666-8666-666666666666";
    await db.exec(`insert into auth.users(id) values('${admin}'),('${owner}'),('${other}'); update profiles set role='admin' where id='${admin}';
 insert into reports(id,reporter_id,title,description,category,zone) values('${a}','${owner}','Private title','Original resident description','road','North'),('${b}','${other}','Other private title','Other private description','road','South'),('${c}','${owner}','Third title','Third private description','road','North');`);
    const as = async (id: string, role = "authenticated") =>
      db.exec(
        `reset role; set role ${role}; select set_config('request.jwt.claim.sub','${id}',false)`,
      );
    const workflow = (
      id: string,
      duplicate: string | null,
      version: number,
      assignee: string | null = admin,
    ) =>
      db.query("select set_report_workflow($1,$2,$3,$4,$5,$6)", [
        id,
        assignee,
        "Engineering",
        "2020-01-01",
        duplicate,
        version,
      ]);
    await as(owner);
    await assert.rejects(workflow(a, null, 0));
    await assert.rejects(
      db.query("select add_report_internal_note($1,$2)", [
        a,
        "Secret admin note",
      ]),
    );
    await assert.rejects(
      db.query("select save_report_feedback($1,5,null)", [a]),
    );
    await db.query("select save_report_location($1,14.123456,121.654321)", [a]);
    await assert.rejects(
      db.query("select save_report_location($1,null,20)", [a]),
    );
    await assert.rejects(
      db.query("select save_report_location($1,91,20)", [a]),
    );
    await db.query("select save_report_location($1,null,null)", [a]);
    assert.equal(
      (await db.query("select * from report_locations")).rows.length,
      0,
    );
    await db.query("select save_report_location($1,14.123456,121.654321)", [a]);
    await as(other);
    assert.equal(
      (await db.query("select * from report_locations")).rows.length,
      0,
    );
    await assert.rejects(db.query("select save_report_location($1,0,0)", [a]));
    await as(admin);
    await assert.rejects(workflow(a, null, 0, other));
    await workflow(a, b, 0);
    await assert.rejects(workflow(a, c, 0), { code: "PT409" });
    await workflow(b, c, 0);
    const summary = (
      await db.query<{
        admin_operations_summary: { overdue: number; unassigned: number };
      }>("select admin_operations_summary()")
    ).rows[0].admin_operations_summary;
    assert.equal(summary.overdue, 2);
    assert.equal(summary.unassigned, 1);
    await assert.rejects(workflow(c, a, 0));
    await assert.rejects(workflow(c, c, 0));
    await db.query("select add_report_internal_note($1,$2)", [
      a,
      "Secret admin note",
    ]);
    await assert.rejects(db.query("update report_workflows set version=20"));
    await db.query("select transition_report($1,'in_progress','Accepted',0)", [
      a,
    ]);
    await db.query("select transition_report($1,'resolved','Completed',1)", [
      a,
    ]);
    await db.query(
      "select set_report_publication($1,true,'Safe title','Safe public summary with enough detail','North',true)",
      [a],
    );
    await db.query("select set_public_map_pin($1,14.123456,121.654321)", [a]);
    await assert.rejects(db.query("select set_public_map_pin($1,14,121)", [b]));
    await as("", "anon");
    const pin = (
      await db.query<{ latitude: number; longitude: number }>(
        "select * from community_map_pins",
      )
    ).rows[0];
    assert.equal(Number(pin.latitude), 14.12);
    assert.equal(Number(pin.longitude), 121.65);
    const mapIssue = (
      await db.query<Record<string, unknown>>(
        "select * from public_map_issues()",
      )
    ).rows[0];
    assert.deepEqual(
      Object.keys(mapIssue).sort(),
      [
        "report_id",
        "public_title",
        "category",
        "status",
        "latitude",
        "longitude",
      ].sort(),
    );
    assert.equal(mapIssue.public_title, "Safe title");
    assert.equal(JSON.stringify(mapIssue).includes("Private"), false);
    await assert.rejects(
      db.query("select admin_monthly_export_summary('2026-11')"),
    );
    await assert.rejects(db.query("select * from report_locations"));
    await as(owner);
    assert.equal(
      (await db.query("select * from report_workflows")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from report_internal_notes")).rows.length,
      0,
    );
    await db.query("select save_report_feedback($1,4,$2)", [
      a,
      "Private resident feedback",
    ]);
    await assert.rejects(
      db.query("select save_report_feedback($1,6,null)", [a]),
    );
    await assert.rejects(db.query("select set_public_map_pin($1,14,121)", [a]));
    await assert.rejects(
      db.query("select save_report_location($1,10,20)", [a]),
    );
    const declined = (
      await db.query<{ request_report_reopen: string }>(
        "select request_report_reopen($1,$2)",
        [a, "Please review the same issue again"],
      )
    ).rows[0].request_report_reopen;
    await as(admin);
    await db.query("select review_report_reopen($1,false,$2,1)", [
      declined,
      "Resolution confirmed after inspection",
    ]);
    assert.equal(
      (
        await db.query<{ status: string }>(
          "select status from reports where id=$1",
          [a],
        )
      ).rows[0].status,
      "resolved",
    );
    assert.equal(
      (await db.query("select * from report_updates where report_id=$1", [a]))
        .rows.length,
      2,
    );
    await as(owner);
    const request = (
      await db.query<{ request_report_reopen: string }>(
        "select request_report_reopen($1,$2)",
        [a, "The problem returned after repair"],
      )
    ).rows[0].request_report_reopen;
    await assert.rejects(
      db.query("select request_report_reopen($1,$2)", [a, "Second request"]),
    );
    await as(other);
    assert.equal(
      (await db.query("select * from report_feedback")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from report_reopen_requests")).rows.length,
      0,
    );
    await assert.rejects(
      db.query("select review_report_reopen($1,true,$2,2)", [
        request,
        "Recheck approved",
      ]),
    );
    await as(admin);
    await assert.rejects(
      db.query("select review_report_reopen($1,true,$2,0)", [
        request,
        "Recheck approved",
      ]),
      { code: "PT409" },
    );
    // A notification failure must roll back the decision, status, audit and publication together.
    await db.exec(`reset role; create function public.fail_operations_notification() returns trigger language plpgsql as $$begin raise exception 'simulated notification failure'; end$$;
      create trigger fail_operations_notification before insert on public.notifications for each row execute function public.fail_operations_notification();`);
    await as(admin);
    await assert.rejects(
      db.query("select review_report_reopen($1,true,$2,2)", [
        request,
        "Recheck approved",
      ]),
    );
    assert.equal(
      (
        await db.query<{ status: string }>(
          "select status from report_reopen_requests where id=$1",
          [request],
        )
      ).rows[0].status,
      "pending",
    );
    assert.equal(
      (
        await db.query<{ is_public: boolean }>(
          "select is_public from reports where id=$1",
          [a],
        )
      ).rows[0].is_public,
      true,
    );
    await db.exec(
      "reset role; drop trigger fail_operations_notification on public.notifications",
    );
    await as(admin);
    await db.query("select review_report_reopen($1,true,$2,2)", [
      request,
      "Recheck approved",
    ]);
    await assert.rejects(
      db.query("select review_report_reopen($1,true,$2,2)", [
        request,
        "Replay denied",
      ]),
    );
    const report = (
      await db.query<{
        status: string;
        is_public: boolean;
        description: string;
        status_version: number;
      }>("select * from reports where id=$1", [a])
    ).rows[0];
    assert.equal(report.status, "in_progress");
    assert.equal(report.is_public, false);
    assert.equal(report.description, "Original resident description");
    assert.equal(report.status_version, 3);
    assert.equal(
      (await db.query("select * from report_updates where report_id=$1", [a]))
        .rows.length,
      3,
    );
    await as(owner);
    assert.equal(
      (await db.query("select * from notifications")).rows.length,
      3,
    );
    await as("", "anon");
    assert.equal(
      (await db.query("select * from community_map_pins")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public_map_issues()")).rows.length,
      0,
    );
    await db.exec(`reset role;
      insert into reports(reporter_id,title,description,category,zone,status,is_public,public_title,public_summary,public_zone,created_at)
      select '${owner}','Private title','Private report details','road','North','resolved',true,'Safe map title','Safe public summary with enough detail','North','2042-11-01T00:00:00+08:00'::timestamptz+n*interval '1 minute' from generate_series(1,202) n;
      insert into community_map_pins(report_id,latitude,longitude) select id,14.12,121.65 from reports where created_at>='2042-11-01T00:00:00+08:00' and created_at<'2042-12-01T00:00:00+08:00';`);
    await as(admin);
    const exportSummary = (
      await db.query<{
        admin_monthly_export_summary: {
          total: number;
          statuses: { resolved: number };
        };
      }>("select admin_monthly_export_summary('2042-11')")
    ).rows[0].admin_monthly_export_summary;
    assert.equal(exportSummary.total, 202);
    assert.equal(exportSummary.statuses.resolved, 202);
    await assert.rejects(
      db.query("select admin_monthly_export_summary('2042-13')"),
      { code: "22023" },
    );
    await as(owner);
    await assert.rejects(
      db.query("select admin_monthly_export_summary('2042-11')"),
      { code: "42501" },
    );
    await as("", "anon");
    assert.equal(
      (await db.query("select * from public_map_issues()")).rows.length,
      200,
    );
    // Migration 009 must start enforcing approval as soon as migration 010 adds the column.
    await db.exec(
      "reset role; alter table profiles add column approval_status text default 'approved'; update profiles set approval_status='pending';",
    );
    await as(owner);
    await assert.rejects(
      db.query("select save_report_location($1,14,121)", [a]),
      { code: "42501" },
    );
    await assert.rejects(
      db.query("select save_report_feedback($1,5,null)", [a]),
      { code: "42501" },
    );
    await assert.rejects(
      db.query("select request_report_reopen($1,$2)", [
        a,
        "Another repair was unsuccessful",
      ]),
      { code: "42501" },
    );
    await as(admin);
    await assert.rejects(workflow(a, null, 3), { code: "42501" });
    await assert.rejects(
      db.query("select add_report_internal_note($1,$2)", [
        a,
        "Blocked administrator note",
      ]),
      { code: "42501" },
    );
    await assert.rejects(
      db.query("select set_public_map_pin($1,null,null)", [a]),
      { code: "42501" },
    );
    await assert.rejects(
      db.query("select review_report_reopen($1,false,$2,3)", [
        request,
        "Blocked review",
      ]),
      { code: "42501" },
    );
  } finally {
    await db.close();
  }
});
