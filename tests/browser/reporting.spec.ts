import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "../../src/lib/supabase/config";

test("report pages require authentication", async ({ page }) => {
  for (const route of [
    "/reports",
    "/reports/new",
    "/reports/11111111-1111-4111-8111-111111111111",
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(supabaseConfig() ? /\/login$/ : /\/setup$/);
  }
});

test("resident submits, retries, searches and tracks a real report bilingually", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const config = supabaseConfig();
  const email = process.env.DEMO_RESIDENT_EMAIL;
  const password = process.env.DEMO_RESIDENT_PASSWORD;
  test.skip(
    !config || !email || !password,
    "Requires configured resident demo account and both database migrations.",
  );
  const client = createClient(config!.url, config!.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const login = await client.auth.signInWithPassword({
      email: email!,
      password: password!,
    });
    expect(
      login.error,
      "The resident demo account must be provisioned before running reporting tests.",
    ).toBeNull();
    const schema = await client
      .from("reports")
      .select("submission_key", { head: true })
      .limit(1);
    expect(
      schema.error,
      "Apply supabase/migrations/202611230001_reporting.sql before running this test.",
    ).toBeNull();
    const searchSchema = await client.rpc(
      "search_my_reports",
      { p_search: "" },
      { head: true },
    );
    expect(
      searchSchema.error,
      "Apply supabase/migrations/202611230002_reporting_hardening.sql before running this test.",
    ).toBeNull();

    await page.goto("/login");
    await page.getByLabel("Email address").fill(email!);
    await page.getByLabel("Password", { exact: true }).fill(password!);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    const stat = page
      .locator(".stat-card")
      .filter({
        has: page.getByRole("heading", { name: "Total reports", exact: true }),
      })
      .locator(".stat-number");
    const before = Number((await stat.innerText()).replace(/,/g, ""));
    expect(Number.isFinite(before)).toBe(true);
    await page.goto("/reports/new");
    await page
      .getByRole("button", { name: "Submit report", exact: true })
      .click();
    await expect(page.locator("#title-error")).toBeVisible();
    const title = `Demo test - streetlight (park) ${randomUUID().slice(0, 8)}`;
    const description =
      "Fictional automated test report. No real community issue is being reported.";
    await page.getByLabel("Issue title", { exact: true }).fill(title);
    await page
      .getByLabel("Category", { exact: true })
      .selectOption("streetlight");
    await page.getByLabel("Description", { exact: true }).fill(description);
    await page.getByLabel("Zone / Purok", { exact: true }).fill("Purok Demo");
    await page
      .getByLabel(/Location details/)
      .fill("Fictional landmark for automated testing only.");
    const token = await page
      .locator('input[name="submission_key"]')
      .inputValue();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: "test-results/report-form-desktop.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Submit report", exact: true })
      .click();
    await expect(page).toHaveURL(/\/reports\/[0-9a-f-]+\?submitted=1$/);
    await expect(page.locator(".success-banner[role=status]")).toContainText(
      "Your report was submitted",
    );
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Your report is awaiting review by the barangay.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator(".report-timeline li")).toHaveCount(1);
    const reportUrl = page.url();
    const id = new URL(reportUrl).pathname.split("/").at(-1)!;
    // Retry through the authenticated API too: UI controls are not the security boundary.
    const retry = await client.rpc("create_report", {
      p_title: title,
      p_description: description,
      p_category: "streetlight",
      p_zone: "Purok Demo",
      p_location_details: "Fictional landmark for automated testing only.",
      p_submission_key: token,
    });
    expect(retry.error).toBeNull();
    expect(retry.data).toBe(id);
    const stored = await client
      .from("reports")
      .select("id,tracking_no,status,reporter_id")
      .eq("id", id)
      .single();
    expect(stored.data?.status).toBe("pending_review");
    expect(stored.data?.reporter_id).toBe(login.data.user!.id);
    expect(stored.data?.tracking_no).toMatch(/^AY-\d{6,}$/);
    const denied = await client
      .from("reports")
      .update({ status: "resolved" })
      .eq("id", id);
    expect(denied.error).not.toBeNull();
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.screenshot({
      path: "test-results/report-details-mobile.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Gamitin ang Filipino" }).click();
    await expect(
      page.getByRole("heading", { name: "Kasaysayan ng katayuan" }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "fil");
    await page.getByRole("button", { name: "Use English" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    await page.goto(
      `/reports?q=${encodeURIComponent(stored.data!.tracking_no)}&category=streetlight&status=pending_review&sort=oldest`,
    );
    await expect(page.locator(".report-card")).toHaveCount(1);
    await expect(
      page.getByRole("link", {
        name: `${stored.data!.tracking_no}: ${title}`,
        exact: true,
      }),
    ).toBeVisible();
    await page.getByLabel("Search reports", { exact: true }).fill(title);
    await page
      .getByRole("button", { name: "Apply filters", exact: true })
      .click();
    await expect(page.locator(".report-card")).toHaveCount(1);
    await page
      .getByLabel("Search reports", { exact: true })
      .fill(`no-match-${randomUUID()}`);
    await page
      .getByRole("button", { name: "Apply filters", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "No reports match your filters" }),
    ).toBeVisible();
    await page.goto("/reports?page=10000");
    await expect(page).not.toHaveURL(/page=10000/);
    await page.goto("/dashboard");
    await expect(stat).toHaveText(
      new Intl.NumberFormat("en").format(before + 1),
    );
    await page.goto("/reports/not-a-uuid");
    await expect(
      page.getByRole("heading", { name: "This page could not be found" }),
    ).toBeVisible();
    await page.goto("/reports/00000000-0000-4000-8000-000000000000");
    await expect(
      page.getByRole("heading", { name: "This page could not be found" }),
    ).toBeVisible();

    if (process.env.DEMO_ADMIN_EMAIL && process.env.DEMO_ADMIN_PASSWORD) {
      const context = await browser.newContext();
      try {
        const adminPage = await context.newPage();
        await adminPage.goto("/login");
        await adminPage
          .getByLabel("Email address")
          .fill(process.env.DEMO_ADMIN_EMAIL);
        await adminPage
          .getByLabel("Password", { exact: true })
          .fill(process.env.DEMO_ADMIN_PASSWORD);
        await adminPage
          .getByRole("button", { name: "Sign in", exact: true })
          .click();
        await expect(adminPage).toHaveURL(/\/admin$/);
        await adminPage.goto(`/reports/${id}`);
        await expect(
          adminPage.getByRole("heading", { name: title, exact: true }),
        ).toBeVisible();
        await adminPage.goto("/reports/new");
        await expect(adminPage).toHaveURL(/\/admin$/);
      } finally {
        await context.close();
      }
    }
  } finally {
    await client.auth.signOut({ scope: "local" });
  }
});
