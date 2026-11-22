import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "../../src/lib/supabase/config";

test("private admin routes reject signed-out users", async ({ page }) => {
  for (const path of [
    "/admin/reports",
    "/admin/reports/11111111-1111-4111-8111-111111111111",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(supabaseConfig() ? /\/login$/ : /\/setup$/);
  }
});

test("admin accepts, resolves, rejects and handles conflicting updates with real official history", async ({
  page,
  browser,
}) => {
  test.setTimeout(180_000);
  const config = supabaseConfig();
  const residentEmail = process.env.DEMO_RESIDENT_EMAIL;
  const residentPassword = process.env.DEMO_RESIDENT_PASSWORD;
  const adminEmail = process.env.DEMO_ADMIN_EMAIL;
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD;
  test.skip(
    !config ||
      !residentEmail ||
      !residentPassword ||
      !adminEmail ||
      !adminPassword,
    "Requires both demo accounts and the Phase 3 migration.",
  );
  const resident = createClient(config!.url, config!.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(config!.url, config!.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  async function loginPage(target: Page, email: string, password: string) {
    await target.goto("/login");
    await target.getByLabel("Email address").fill(email);
    await target.getByLabel("Password", { exact: true }).fill(password);
    await target.getByRole("button", { name: "Sign in", exact: true }).click();
  }
  try {
    const residentAuth = await resident.auth.signInWithPassword({
      email: residentEmail!,
      password: residentPassword!,
    });
    expect(residentAuth.error).toBeNull();
    const adminAuth = await admin.auth.signInWithPassword({
      email: adminEmail!,
      password: adminPassword!,
    });
    expect(adminAuth.error).toBeNull();
    const ready = await admin.rpc("admin_report_stats");
    expect(
      ready.error,
      "Apply 202611230003_admin_management.sql first.",
    ).toBeNull();
    const ids: string[] = [];
    const tag = randomUUID().slice(0, 8);
    for (const purpose of ["resolve", "reject", "conflict"]) {
      const result = await resident.rpc("create_report", {
        p_title: `Demo admin test (${purpose}) ${tag}`,
        p_category: "other",
        p_description:
          "Fictional automated administration test, not an actual community issue.",
        p_zone: "Purok Admin Demo",
        p_location_details: "Fictional test location.",
        p_submission_key: randomUUID(),
      });
      expect(result.error).toBeNull();
      ids.push(result.data as string);
    }
    const [resolveId, rejectId, conflictId] = ids;
    const change = (
      id: string,
      target: string,
      note: string,
      version: number,
    ) =>
      admin.rpc("transition_report", {
        p_report_id: id,
        p_new_status: target,
        p_note: note,
        p_expected_version: version,
      });
    const residentDenied = await resident.rpc("transition_report", {
      p_report_id: resolveId,
      p_new_status: "in_progress",
      p_note: "Unauthorized resident attempt.",
      p_expected_version: 0,
    });
    expect(residentDenied.error?.code).toBe("42501");
    const hiddenAdminSearch = await resident.rpc("search_admin_reports", {
      p_search: "",
    });
    expect(hiddenAdminSearch.data).toEqual([]);
    const privateProfile = await resident
      .from("profiles")
      .select("full_name")
      .eq("id", adminAuth.data.user!.id);
    expect(privateProfile.data).toEqual([]);
    const skip = await change(
      resolveId,
      "resolved",
      "Invalid skipping of review.",
      0,
    );
    expect(skip.error?.code).toBe("22023");

    await loginPage(page, adminEmail!, adminPassword!);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto(`/admin/reports/${resolveId}`);
    await expect(
      page.getByText("Demo Resident", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Review change", exact: true })
      .click();
    await expect(page.locator("#status-note-error")).toBeVisible();
    await page
      .getByLabel("Action / acceptance note", { exact: true })
      .fill("Accepted for fictional repair by the demo team.");
    await page
      .getByRole("button", { name: "Review change", exact: true })
      .click();
    await expect(
      page.getByRole("group", { name: "Confirm this official update" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Keep editing", exact: true })
      .click();
    const unchanged = await resident
      .from("reports")
      .select("status")
      .eq("id", resolveId)
      .single();
    expect(unchanged.data?.status).toBe("pending_review");
    await page
      .getByRole("button", { name: "Review change", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirm change", exact: true })
      .click();
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === `/admin/reports/${resolveId}` &&
        url.searchParams.get("updated") === "1",
    );
    await expect(
      page.locator(".report-detail-heading .report-status"),
    ).toHaveText("In Progress");
    await expect(
      page.getByLabel("Next status", { exact: true }).locator("option"),
    ).toHaveCount(1);
    const stale = await change(
      resolveId,
      "resolved",
      "Stale review must not win.",
      0,
    );
    expect(stale.error?.code).toBe("PT409");
    await page
      .getByLabel("Completion / resolution note", { exact: true })
      .fill("Fictional repair completed and inspected by the demo team.");
    await page
      .getByRole("button", { name: "Review change", exact: true })
      .click();
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: "test-results/admin-review-desktop.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Confirm change", exact: true })
      .click();
    await expect(
      page.locator(".report-detail-heading .report-status"),
    ).toHaveText("Resolved");
    await expect(
      page.getByText(
        "This report is closed. No further status changes are available.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.locator(".report-timeline li")).toHaveCount(3);
    const terminal = await change(
      resolveId,
      "rejected",
      "Terminal reports cannot change.",
      2,
    );
    expect(terminal.error?.code).toBe("22023");

    await page.goto(`/admin/reports/${rejectId}`);
    await page
      .getByLabel("Next status", { exact: true })
      .selectOption("rejected");
    await page
      .getByLabel("Reason for rejection", { exact: true })
      .fill("Fictional test is a duplicate, so it is rejected.");
    await page
      .getByRole("button", { name: "Review change", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirm change", exact: true })
      .click();
    await expect(
      page.locator(".report-detail-heading .report-status"),
    ).toHaveText("Rejected");
    const reopened = await change(
      rejectId,
      "in_progress",
      "Terminal rejection cannot reopen.",
      1,
    );
    expect(reopened.error?.code).toBe("22023");

    const races = await Promise.all([
      change(conflictId, "in_progress", "Fictional concurrent acceptance.", 0),
      change(conflictId, "rejected", "Fictional concurrent rejection.", 0),
    ]);
    expect(races.filter((result) => !result.error)).toHaveLength(1);
    expect(
      races.filter((result) => result.error?.code === "PT409"),
    ).toHaveLength(1);
    const audit = await admin
      .from("report_updates")
      .select("id,admin_id,old_status,new_status,created_at")
      .eq("report_id", conflictId);
    expect(audit.data).toHaveLength(1);
    expect(audit.data![0].admin_id).toBe(adminAuth.data.user!.id);
    const resolvedHistory = await resident
      .from("report_updates")
      .select("id,note")
      .eq("report_id", resolveId);
    expect(resolvedHistory.data).toHaveLength(2);
    const rejectedHistory = await resident
      .from("report_updates")
      .select("id")
      .eq("report_id", rejectId);
    expect(rejectedHistory.data).toHaveLength(1);
    const illegalAuditEdit = await admin
      .from("report_updates")
      .update({ note: "Tampering attempt" })
      .eq("report_id", resolveId);
    expect(illegalAuditEdit.error).not.toBeNull();

    const stats = await admin.rpc("admin_report_stats");
    expect(stats.error).toBeNull();
    await page.goto("/admin");
    for (const [label, key] of [
      ["Total reports", "total"],
      ["Pending review", "pending_review"],
      ["In progress", "in_progress"],
      ["Resolved", "resolved"],
      ["Rejected", "rejected"],
    ]) {
      await expect(
        page
          .locator(".stat-card")
          .filter({
            has: page.getByRole("heading", { name: label, exact: true }),
          })
          .locator(".stat-number"),
      ).toHaveText(new Intl.NumberFormat("en").format(stats.data[key]));
    }
    await page.goto(
      `/admin/reports?q=${encodeURIComponent(`Demo admin test (resolve) ${tag}`)}&status=resolved&category=other&zone=Purok+Admin+Demo&sort=oldest`,
    );
    await expect(page.locator(".admin-table tbody tr")).toHaveCount(1);
    await expect(
      page.getByRole("link", { name: "Review report", exact: true }),
    ).toBeVisible();
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.screenshot({
      path: "test-results/admin-list-mobile.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Gamitin ang Filipino" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Pamahalaan ang mga ulat",
        exact: true,
      }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "fil");
    await page.getByRole("button", { name: "Use English" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.goto(`/admin/reports?q=no-match-${randomUUID()}`);
    await expect(
      page.getByRole("heading", { name: "No reports to show", exact: true }),
    ).toBeVisible();
    await page.goto("/admin/reports?page=10000");
    await expect(page).not.toHaveURL(/page=10000/);

    const context = await browser.newContext();
    try {
      const ownerPage = await context.newPage();
      await loginPage(ownerPage, residentEmail!, residentPassword!);
      await expect(ownerPage).toHaveURL(/\/dashboard$/);
      await ownerPage.goto(`/reports/${resolveId}`);
      await expect(ownerPage.locator(".report-timeline li")).toHaveCount(3);
      await expect(
        ownerPage.getByText(
          "Fictional repair completed and inspected by the demo team.",
          { exact: true },
        ),
      ).toBeVisible();
      await ownerPage.goto(`/reports/${rejectId}`);
      await expect(
        ownerPage.getByText(
          "Fictional test is a duplicate, so it is rejected.",
          { exact: true },
        ),
      ).toBeVisible();
      await ownerPage.goto(`/admin/reports/${resolveId}`);
      await expect(ownerPage).toHaveURL(/\/dashboard$/);
      await ownerPage.goto("/admin/reports");
      await expect(ownerPage).toHaveURL(/\/dashboard$/);
    } finally {
      await context.close();
    }
  } finally {
    await resident.auth.signOut({ scope: "local" });
    await admin.auth.signOut({ scope: "local" });
  }
});
