import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { supabaseConfig } from "../../src/lib/supabase/config";

test("live approval, private operations, public pins and reopen history work together", async ({
  page,
  browser,
}) => {
  test.setTimeout(240000);
  const config = supabaseConfig(),
    secret = process.env.SUPABASE_SECRET_KEY;
  test.skip(
    !config ||
      !secret ||
      !process.env.DEMO_ADMIN_EMAIL ||
      !process.env.DEMO_ADMIN_PASSWORD,
    "Requires configured approved administrator and migrations009–012.",
  );
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const trusted = createClient(config!.url, secret!, options),
    admin = createClient(config!.url, config!.key, options),
    resident = createClient(config!.url, config!.key, options),
    anon = createClient(config!.url, config!.key, options);
  const context = await browser.newContext();
  const adminPage = await context.newPage();
  const tag = randomUUID().slice(0, 8),
    name = `Temporary service resident ${tag}`,
    email = `ayos-service-${randomUUID()}@example.test`,
    password = randomUUID() + randomUUID();
  let userId: string | undefined;
  const reports: string[] = [];
  const login = async (target: Page, user: string, pass: string) => {
    await target.goto("/login");
    await target.getByLabel("Email address").fill(user);
    await target.getByLabel("Password", { exact: true }).fill(pass);
    await target.getByRole("button", { name: "Sign in", exact: true }).click();
  };
  try {
    const signed = await admin.auth.signInWithPassword({
      email: process.env.DEMO_ADMIN_EMAIL!,
      password: process.env.DEMO_ADMIN_PASSWORD!,
    });
    expect(signed.error).toBeNull();
    expect(
      (await admin.rpc("registration_ready")).data,
      "Apply migrations009–012 before live acceptance.",
    ).toBe(true);
    const account = await trusted.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        zone: "Fictional zone",
        role: "admin",
        approval_status: "approved",
      },
    });
    expect(account.error).toBeNull();
    userId = account.data.user!.id;
    expect(
      (await resident.auth.signInWithPassword({ email, password })).error,
    ).toBeNull();
    const profile = await resident
      .from("profiles")
      .select("role,approval_status")
      .eq("id", userId)
      .single();
    expect(profile.data).toEqual({
      role: "resident",
      approval_status: "pending",
    });
    const input = {
      p_title: `PRIVATE service fixture ${tag}`,
      p_category: "other",
      p_description: "Fictional private service workflow details.",
      p_zone: "Fictional zone",
      p_location_details: null,
      p_submission_key: randomUUID(),
    };
    expect((await resident.rpc("create_report", input)).error).not.toBeNull();
    await login(page, email, password);
    await expect(page).toHaveURL(/\/account-pending$/);
    await page.bringToFront();
    await expect(page.getByText("Live updates", { exact: true })).toBeVisible({
      timeout: 30000,
    });
    await login(
      adminPage,
      process.env.DEMO_ADMIN_EMAIL!,
      process.env.DEMO_ADMIN_PASSWORD!,
    );
    await expect(adminPage).toHaveURL(/\/admin$/);
    await adminPage.goto("/admin/members");
    const member = adminPage
      .locator("section.operations-panel")
      .filter({ has: adminPage.getByRole("heading", { name, exact: true }) });
    await page.bringToFront();
    await member
      .getByRole("button", { name: "Approve resident", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (
            await resident
              .from("profiles")
              .select("approval_status")
              .eq("id", userId!)
              .single()
          ).data?.approval_status,
      )
      .toBe("approved");
    expect(await page.evaluate(() => document.visibilityState)).toBe("visible");
    // This must beat the30-second polling interval: exercise actual Realtime approval.
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20000 });
    const created = await resident.rpc("create_report", input);
    expect(created.error).toBeNull();
    const id = String(created.data);
    reports.push(id);
    const second = await resident.rpc("create_report", {
      ...input,
      p_title: `PRIVATE duplicate fixture ${tag}`,
      p_submission_key: randomUUID(),
    });
    expect(second.error).toBeNull();
    const duplicate = String(second.data);
    reports.push(duplicate);
    const workflow = {
      p_report_id: id,
      p_assignee_id: signed.data.user!.id,
      p_responsible_office: "Fictional maintenance desk",
      p_target_date: new Date(Date.now() - 172800000)
        .toISOString()
        .slice(0, 10),
      p_duplicate_of: null,
      p_expected_version: 0,
    };
    expect((await admin.rpc("set_report_workflow", workflow)).error).toBeNull();
    expect((await admin.rpc("set_report_workflow", workflow)).error?.code).toBe(
      "PT409",
    );
    expect(
      (
        await admin.rpc("add_report_internal_note", {
          p_report_id: id,
          p_note: "PRIVATE internal fixture note",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await resident
          .from("report_internal_notes")
          .select("note")
          .eq("report_id", id)
      ).data,
    ).toEqual([]);
    expect(
      (
        await admin.rpc("set_report_workflow", {
          ...workflow,
          p_report_id: duplicate,
          p_duplicate_of: id,
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await admin.rpc("set_report_workflow", {
          ...workflow,
          p_duplicate_of: duplicate,
          p_expected_version: 1,
        })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await resident.rpc("save_report_location", {
          p_report_id: id,
          p_latitude: 14.612345,
          p_longitude: 121.034567,
        })
      ).error,
    ).toBeNull();
    expect(
      (await anon.from("report_locations").select("*").eq("report_id", id))
        .error,
    ).not.toBeNull();
    expect(
      (
        await admin.rpc("transition_report", {
          p_report_id: id,
          p_new_status: "in_progress",
          p_note: "Fictional acceptance.",
          p_expected_version: 0,
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await admin.rpc("set_report_publication", {
          p_report_id: id,
          p_published: true,
          p_title: `Fictional public issue ${tag}`,
          p_summary:
            "A fictional issue for public map and workflow verification.",
          p_zone: "General demo zone",
          p_confirmed_safe: true,
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await admin.rpc("set_public_map_pin", {
          p_report_id: id,
          p_latitude: 14.612345,
          p_longitude: 121.034567,
        })
      ).error,
    ).toBeNull();
    const pins = await anon.rpc("public_map_issues");
    expect(pins.error).toBeNull();
    const pin = pins.data.find(
      (row: { report_id: string }) => row.report_id === id,
    );
    expect(Number(pin.latitude)).toBe(14.61);
    expect(Number(pin.longitude)).toBe(121.03);
    expect(JSON.stringify(pin)).not.toContain("PRIVATE");
    await adminPage.goto("/admin/exports");
    const month = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
    }).format(new Date());
    const monthValue = /^\d{4}-\d{2}$/.test(month)
      ? month
      : new Date().toISOString().slice(0, 7);
    const csv = await adminPage.request.get(
      `/api/admin/exports?month=${monthValue}&format=csv&locale=en`,
    );
    expect(csv.status()).toBe(200);
    expect(csv.headers()["cache-control"]).toContain("no-store");
    expect(await csv.text()).toContain(input.p_title);
    const pdf = await adminPage.request.get(
      `/api/admin/exports?month=${monthValue}&format=pdf&locale=fil`,
    );
    expect(pdf.status()).toBe(200);
    expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");
    expect(
      (
        await admin.rpc("transition_report", {
          p_report_id: id,
          p_new_status: "resolved",
          p_note: "Fictional resolution.",
          p_expected_version: 1,
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await resident.rpc("save_report_feedback", {
          p_report_id: id,
          p_rating: 4,
          p_comment: "Fictional resident feedback.",
        })
      ).error,
    ).toBeNull();
    const reopen = await resident.rpc("request_report_reopen", {
      p_report_id: id,
      p_reason: "Fictional issue recurred and needs another review.",
    });
    expect(reopen.error).toBeNull();
    expect(
      (
        await admin.rpc("review_report_reopen", {
          p_request_id: reopen.data,
          p_approve: true,
          p_note: "Fictional reviewed reopening.",
          p_expected_version: 1,
        })
      ).error,
    ).toBeNull();
    const final = await resident
      .from("reports")
      .select("status,is_public")
      .eq("id", id)
      .single();
    expect(final.data).toEqual({ status: "in_progress", is_public: false });
    expect(
      (await resident.from("report_updates").select("id").eq("report_id", id))
        .data,
    ).toHaveLength(3);
    expect(
      (await anon.rpc("public_map_issues")).data.some(
        (row: { report_id: string }) => row.report_id === id,
      ),
    ).toBe(false);
    await page.goto(`/reports/${id}`);
    await expect(
      page.getByText("PRIVATE internal fixture note", { exact: true }),
    ).toHaveCount(0);
  } finally {
    const cleanupErrors: string[] = [];
    if (reports.length) {
      const cleanup = await trusted
        .from("reports")
        .delete()
        .in("id", reports)
        .eq("reporter_id", userId!);
      if (cleanup.error)
        cleanupErrors.push(`report cleanup: ${cleanup.error.code}`);
    }
    if (userId) {
      const cleanup = await trusted.auth.admin.deleteUser(userId);
      if (cleanup.error) cleanupErrors.push("account cleanup failed");
    }
    await context.close();
    await resident.auth.signOut({ scope: "local" });
    await admin.auth.signOut({ scope: "local" });
    expect(cleanupErrors).toEqual([]);
  }
});
