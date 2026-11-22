import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "../../src/lib/supabase/config";

test("photo controls preview, remove and reject unsupported files before saving", async ({
  page,
}) => {
  test.skip(
    !supabaseConfig() ||
      !process.env.DEMO_RESIDENT_EMAIL ||
      !process.env.DEMO_RESIDENT_PASSWORD,
    "Requires the existing resident demo account.",
  );
  await page.goto("/login");
  await page.getByLabel("Email address").fill(process.env.DEMO_RESIDENT_EMAIL!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.DEMO_RESIDENT_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/reports/new");
  const png = await sharp({
    create: { width: 10, height: 10, channels: 3, background: "green" },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel("Add photos (optional)", { exact: true })
    .setInputFiles({ name: "preview.png", mimeType: "image/png", buffer: png });
  await expect(page.locator(".evidence-previews li")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Remove: preview.png", exact: true })
    .click();
  await expect(page.locator(".evidence-previews li")).toHaveCount(0);
  await page
    .getByLabel("Add photos (optional)", { exact: true })
    .setInputFiles({
      name: "blocked.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg/>"),
    });
  await expect(
    page.getByText("Choose only JPEG, PNG or WebP photos.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Gamitin ang Filipino" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "fil");
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("Phase 4 evidence, moderated summaries, confirmations and private notifications work together", async ({
  page,
  browser,
}) => {
  test.setTimeout(240_000);
  const config = supabaseConfig();
  const email = process.env.DEMO_RESIDENT_EMAIL;
  const password = process.env.DEMO_RESIDENT_PASSWORD;
  const adminEmail = process.env.DEMO_ADMIN_EMAIL;
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD;
  const secret = process.env.SUPABASE_SECRET_KEY;
  test.skip(
    !config || !email || !password || !adminEmail || !adminPassword || !secret,
    "Requires demo accounts, server upload key and all Phase 4 migrations.",
  );
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const owner = createClient(config!.url, config!.key, options);
  const admin = createClient(config!.url, config!.key, options);
  const anonymous = createClient(config!.url, config!.key, options);
  const trusted = createClient(config!.url, secret!, options);
  const observer = createClient(config!.url, config!.key, options);
  let observerId: string | undefined;
  let observerReport: string | undefined;
  let reportId: string | undefined;
  const observerEmail = `ayosdito-test-${randomUUID()}@example.test`;
  const observerPassword = randomUUID() + randomUUID();
  const observerContext = await browser.newContext();
  const adminContext = await browser.newContext();
  const anonymousContext = await browser.newContext();
  const login = async (target: Page, user: string, pass: string) => {
    await target.goto("/login");
    await target.getByLabel("Email address").fill(user);
    await target.getByLabel("Password", { exact: true }).fill(pass);
    await target.getByRole("button", { name: "Sign in", exact: true }).click();
  };
  try {
    expect(
      (
        await owner.auth.signInWithPassword({
          email: email!,
          password: password!,
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await admin.auth.signInWithPassword({
          email: adminEmail!,
          password: adminPassword!,
        })
      ).error,
    ).toBeNull();
    expect(
      (await admin.rpc("admin_community_analytics")).error,
      "Apply Phase4 migrations006–008 first.",
    ).toBeNull();
    const created = await trusted.auth.admin.createUser({
      email: observerEmail,
      password: observerPassword,
      email_confirm: true,
      user_metadata: {
        full_name: "Temporary privacy test resident",
        zone: "Test zone",
      },
    });
    expect(created.error).toBeNull();
    observerId = created.data.user!.id;
    expect(
      (
        await observer.auth.signInWithPassword({
          email: observerEmail,
          password: observerPassword,
        })
      ).error,
    ).toBeNull();
    const jpeg = await sharp({
      create: { width: 20, height: 12, channels: 3, background: "green" },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const png = await sharp({
      create: { width: 18, height: 14, channels: 3, background: "orange" },
    })
      .png()
      .toBuffer();
    const webp = await sharp({
      create: { width: 16, height: 16, channels: 3, background: "blue" },
    })
      .webp()
      .toBuffer();
    await login(page, email!, password!);
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto("/reports/new");
    await page
      .getByLabel("Add photos (optional)", { exact: true })
      .setInputFiles({
        name: "bad.svg",
        mimeType: "image/svg+xml",
        buffer: Buffer.from("<svg/>"),
      });
    await expect(
      page.getByText("Choose only JPEG, PNG or WebP photos.", { exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("Add photos (optional)", { exact: true })
      .setInputFiles({
        name: "big.png",
        mimeType: "image/png",
        buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
      });
    await expect(
      page.getByText("Each photo must be no larger than 5 MiB.", {
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByLabel("Add photos (optional)", { exact: true })
      .setInputFiles([
        { name: "resident.jpg", mimeType: "image/jpeg", buffer: jpeg },
        { name: "remove.png", mimeType: "image/png", buffer: png },
      ]);
    await expect(page.locator(".evidence-previews li")).toHaveCount(2);
    await page
      .getByRole("button", { name: "Remove: remove.png", exact: true })
      .click();
    await expect(page.locator(".evidence-previews li")).toHaveCount(1);
    const tag = randomUUID().slice(0, 8);
    const privateTitle = `PRIVATE Demo evidence ${tag}`;
    const privateLocation = `PRIVATE exact location ${tag}`;
    await page.getByLabel("Issue title", { exact: true }).fill(privateTitle);
    await page
      .getByLabel("Category", { exact: true })
      .selectOption("streetlight");
    await page
      .getByLabel("Description", { exact: true })
      .fill("PRIVATE fictional report details, not for publication.");
    await page
      .getByLabel("Zone / Purok", { exact: true })
      .fill("Private test zone");
    await page.getByLabel(/Location details/).fill(privateLocation);
    await page
      .getByRole("button", { name: "Submit report", exact: true })
      .click();
    await expect(page).toHaveURL(/\/reports\/[0-9a-f-]+\?submitted=1$/);
    reportId = new URL(page.url()).pathname.split("/").at(-1)!;
    await expect(
      page.getByRole("img", { name: "Resident photos", exact: true }),
    ).toHaveCount(1);
    const firstPhoto = await owner
      .from("report_photos")
      .select("storage_path")
      .eq("report_id", reportId)
      .eq("upload_state", "ready")
      .single();
    expect(firstPhoto.error).toBeNull();
    const stored = await owner.storage
      .from("report-photos")
      .download(firstPhoto.data!.storage_path);
    expect(stored.error).toBeNull();
    const metadata = await sharp(
      Buffer.from(await stored.data!.arrayBuffer()),
    ).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.exif).toBeUndefined();
    expect(
      (
        await observer.storage
          .from("report-photos")
          .createSignedUrl(firstPhoto.data!.storage_path, 120)
      ).error,
    ).not.toBeNull();
    expect(
      (
        await anonymous.storage
          .from("report-photos")
          .download(firstPhoto.data!.storage_path)
      ).error,
    ).not.toBeNull();
    expect(
      (
        await owner.storage
          .from("report-photos")
          .upload(`${reportId}/${randomUUID()}.webp`, webp, {
            contentType: "image/webp",
          })
      ).error,
    ).not.toBeNull();
    await page
      .getByLabel("Add photos (optional)", { exact: true })
      .setInputFiles([
        { name: "second.png", mimeType: "image/png", buffer: png },
        { name: "third.webp", mimeType: "image/webp", buffer: webp },
      ]);
    await page
      .getByRole("button", { name: "Upload photos", exact: true })
      .click();
    await expect(
      page.getByRole("img", { name: "Resident photos", exact: true }),
    ).toHaveCount(3);
    const origin = new URL(page.url()).origin;
    const forbidden = await page.request.post(
      `/api/reports/${reportId}/evidence`,
      {
        headers: { Origin: origin },
        multipart: {
          photo_type: "resolution",
          request_key: randomUUID(),
          photos: { name: "fake.jpg", mimeType: "image/jpeg", buffer: jpeg },
        },
      },
    );
    expect(forbidden.status()).toBe(403);
    const tooMany = await page.request.post(
      `/api/reports/${reportId}/evidence`,
      {
        headers: { Origin: origin },
        multipart: {
          photo_type: "report",
          request_key: randomUUID(),
          photos: { name: "fourth.png", mimeType: "image/png", buffer: png },
        },
      },
    );
    expect((await tooMany.json()).error).toBe("limit");
    const fake = await page.request.post(`/api/reports/${reportId}/evidence`, {
      headers: { Origin: origin },
      multipart: {
        photo_type: "report",
        request_key: randomUUID(),
        photos: {
          name: "fake.jpg",
          mimeType: "image/jpeg",
          buffer: Buffer.from("not actual image bytes"),
        },
      },
    });
    expect((await fake.json()).error).toBe("fileContent");
    expect(
      (await observer.from("reports").select("id").eq("id", reportId)).data,
    ).toEqual([]);

    expect(
      (
        await admin.rpc("transition_report", {
          p_report_id: reportId,
          p_new_status: "in_progress",
          p_note: "Fictional Phase4 acceptance.",
          p_expected_version: 0,
        })
      ).error,
    ).toBeNull();
    const invisible = await anonymous.rpc("community_reports", {
      p_id: reportId,
    });
    expect(invisible.data).toEqual([]);
    const adminPage = await adminContext.newPage();
    await login(adminPage, adminEmail!, adminPassword!);
    await expect(adminPage).toHaveURL(/\/admin$/);
    await adminPage.goto(`/admin/reports/${reportId}`);
    await expect(
      adminPage.getByLabel("Public title", { exact: true }),
    ).toHaveValue("");
    const publicTitle = `Demo public streetlight (${tag})`;
    await adminPage
      .getByLabel("Public title", { exact: true })
      .fill(publicTitle);
    await adminPage
      .getByLabel("Public summary", { exact: true })
      .fill(
        "A fictional maintenance issue used to verify the moderated community board.",
      );
    await adminPage
      .getByLabel("General public zone", { exact: true })
      .fill("Demo public zone");
    await adminPage.getByRole("checkbox").check();
    await adminPage
      .getByRole("button", { name: "Publish summary", exact: true })
      .click();
    await expect(
      adminPage.getByText("Currently published", { exact: true }),
    ).toBeVisible();
    const projection = await anonymous.rpc("community_reports", {
      p_id: reportId,
    });
    expect(projection.error).toBeNull();
    expect(projection.data).toHaveLength(1);
    expect(JSON.stringify(projection.data)).not.toContain(privateTitle);
    expect(JSON.stringify(projection.data)).not.toContain(privateLocation);
    expect(JSON.stringify(projection.data)).not.toContain(
      firstPhoto.data!.storage_path,
    );
    expect(Object.keys(projection.data[0]).sort()).toEqual(
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
    const anonPage = await anonymousContext.newPage();
    await anonPage.goto(`/community/${reportId}`);
    await expect(
      anonPage.getByRole("heading", { name: publicTitle, exact: true }),
    ).toBeVisible();
    await expect(
      anonPage.getByText(privateLocation, { exact: true }),
    ).toHaveCount(0);
    const confirmations = await Promise.all([
      observer.rpc("set_report_confirmation", {
        p_report_id: reportId,
        p_confirmed: true,
      }),
      observer.rpc("set_report_confirmation", {
        p_report_id: reportId,
        p_confirmed: true,
      }),
    ]);
    expect(confirmations.every((result) => !result.error)).toBe(true);
    const counted = await anonymous.rpc("community_reports", {
      p_id: reportId,
    });
    expect(Number(counted.data[0].confirmation_count)).toBe(1);
    await page.goto(`/community/${reportId}`);
    await page
      .getByRole("button", { name: "I also experience this", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Remove my confirmation", exact: true }),
    ).toBeVisible();
    expect(
      (
        await observer.rpc("set_report_confirmation", {
          p_report_id: reportId,
          p_confirmed: false,
        })
      ).error,
    ).toBeNull();
    await page
      .getByRole("button", { name: "Remove my confirmation", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "I also experience this", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Gamitin ang Filipino" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "fil");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "fil");
    await page.getByRole("button", { name: "Use English" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.screenshot({
      path: "test-results/community-mobile.png",
      fullPage: true,
    });

    expect(
      (
        await admin.rpc("transition_report", {
          p_report_id: reportId,
          p_new_status: "resolved",
          p_note: "Fictional Phase4 resolution.",
          p_expected_version: 1,
        })
      ).error,
    ).toBeNull();
    await adminPage.goto(`/admin/reports/${reportId}`);
    await adminPage
      .getByLabel("Add photos (optional)", { exact: true })
      .setInputFiles({
        name: "resolution.png",
        mimeType: "image/png",
        buffer: png,
      });
    await adminPage
      .getByRole("button", { name: "Upload photos", exact: true })
      .click();
    await expect(
      adminPage.getByRole("img", {
        name: "Official resolution history",
        exact: true,
      }),
    ).toHaveCount(1);
    await page.goto(`/reports/${reportId}`);
    await expect(
      page.getByRole("img", {
        name: "Official resolution history",
        exact: true,
      }),
    ).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: "Upload photos", exact: true }),
    ).toHaveCount(0);
    await page.screenshot({
      path: "test-results/evidence-private-mobile.png",
      fullPage: true,
    });
    const notifications = await owner
      .from("notifications")
      .select("id,report_update_id,is_read")
      .eq("report_id", reportId);
    expect(notifications.data).toHaveLength(2);
    expect(
      new Set(notifications.data!.map((item) => item.report_update_id)).size,
    ).toBe(2);
    expect(
      (
        await observer
          .from("notifications")
          .select("id")
          .eq("report_id", reportId)
      ).data,
    ).toEqual([]);
    await page.goto("/notifications");
    const ourNotifications = page
      .locator(".notification-inbox li")
      .filter({ has: page.locator(`a[href="/reports/${reportId}"]`) });
    await expect(ourNotifications).toHaveCount(2);
    await ourNotifications
      .first()
      .getByRole("button", { name: "Mark as read", exact: true })
      .click();
    await expect(
      ourNotifications.first().getByText("Read", { exact: true }),
    ).toBeVisible();
    const observed = await observer.rpc("create_report", {
      p_title: "Temporary notification test",
      p_description: "A fictional temporary report for inbox verification.",
      p_category: "other",
      p_zone: "Demo",
      p_location_details: null,
      p_submission_key: randomUUID(),
    });
    expect(observed.error).toBeNull();
    observerReport = observed.data;
    expect(
      (
        await admin.rpc("transition_report", {
          p_report_id: observerReport,
          p_new_status: "in_progress",
          p_note: "Fictional temporary acceptance.",
          p_expected_version: 0,
        })
      ).error,
    ).toBeNull();
    const observerPage = await observerContext.newPage();
    await login(observerPage, observerEmail, observerPassword);
    await expect(observerPage).toHaveURL(/\/dashboard$/);
    await observerPage.goto("/notifications");
    await observerPage
      .getByRole("button", { name: "Mark all as read", exact: true })
      .click();
    expect(
      (
        await observer
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("is_read", false)
      ).count,
    ).toBe(0);
    const stats = await admin.rpc("admin_community_analytics");
    expect(stats.error).toBeNull();
    expect(stats.data.months).toHaveLength(12);
    await adminPage.goto("/admin");
    await expect(
      adminPage.getByRole("heading", {
        name: "Community reporting trends",
        exact: true,
      }),
    ).toBeVisible();
    await adminPage.goto(`/admin/reports/${reportId}`);
    await adminPage
      .getByRole("button", { name: "Remove from public board", exact: true })
      .click();
    await expect(
      adminPage.getByText("Not published", { exact: true }),
    ).toBeVisible();
    expect(
      (await anonymous.rpc("community_reports", { p_id: reportId })).data,
    ).toEqual([]);
  } finally {
    if (reportId)
      await admin.rpc("set_report_publication", {
        p_report_id: reportId,
        p_published: false,
        p_title: null,
        p_summary: null,
        p_zone: null,
        p_confirmed_safe: false,
      });
    if (reportId)
      await observer.rpc("set_report_confirmation", {
        p_report_id: reportId,
        p_confirmed: false,
      });
    if (observerReport && observerId)
      await trusted
        .from("reports")
        .delete()
        .eq("id", observerReport)
        .eq("reporter_id", observerId);
    if (observerId) await trusted.auth.admin.deleteUser(observerId);
    await observerContext.close();
    await adminContext.close();
    await anonymousContext.close();
    await owner.auth.signOut({ scope: "local" });
    await admin.auth.signOut({ scope: "local" });
    await observer.auth.signOut({ scope: "local" });
  }
});
