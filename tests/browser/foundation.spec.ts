import { test, expect } from "@playwright/test";
import { supabaseConfig } from "../../src/lib/supabase/config";

// Match the app's URL validation, not just the presence of environment values.
const configured = Boolean(supabaseConfig());

test("unconfigured installation shows actionable setup and persists language", async ({
  page,
}) => {
  test.skip(configured, "This check requires an unconfigured environment.");
  await page.goto("/");
  await expect(page).toHaveURL(/\/setup$/);
  await expect(
    page.getByRole("heading", { name: "Connect your Supabase project" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Gamitin ang Filipino" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "fil");
  await expect(
    page.getByRole("heading", { name: "Ikonekta ang iyong Supabase project" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "fil");
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "test-results/setup-mobile.png",
    fullPage: true,
  });
});

test("protected routes require authentication", async ({ page }) => {
  for (const route of ["/dashboard", "/admin"]) {
    await page.goto(route);
    await expect(page).toHaveURL(configured ? /\/login$/ : /\/setup$/);
  }
});

test("login validates locally, translates errors and fits mobile", async ({
  page,
}) => {
  test.skip(
    !configured,
    "Requires a valid Supabase HTTP(S) URL and publishable key, but no live account.",
  );
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("#email-error")).toHaveText(
    "Enter a valid email address.",
  );
  await page.getByRole("button", { name: "Gamitin ang Filipino" }).click();
  await expect(page.locator("#email-error")).toHaveText(
    "Maglagay ng wastong email address.",
  );
  await page.getByLabel("Email address").fill("resident@example.test");
  await page.getByRole("button", { name: "Mag-sign in", exact: true }).click();
  await expect(page.locator("#password-error")).toContainText(
    "Ilagay ang iyong password",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({
    path: "test-results/login-desktop.png",
    fullPage: true,
  });
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "test-results/login-mobile.png",
    fullPage: true,
  });
});

test("live Supabase resident and admin workflows", async ({ browser }) => {
  const {
    DEMO_RESIDENT_EMAIL,
    DEMO_RESIDENT_PASSWORD,
    DEMO_ADMIN_EMAIL,
    DEMO_ADMIN_PASSWORD,
  } = process.env;
  test.skip(
    !configured ||
      !DEMO_RESIDENT_EMAIL ||
      !DEMO_RESIDENT_PASSWORD ||
      !DEMO_ADMIN_EMAIL ||
      !DEMO_ADMIN_PASSWORD,
    "Requires valid Supabase configuration and provisioned demo accounts.",
  );
  for (const [email, password, destination] of [
    [DEMO_RESIDENT_EMAIL!, DEMO_RESIDENT_PASSWORD!, "/dashboard"],
    [DEMO_ADMIN_EMAIL!, DEMO_ADMIN_PASSWORD!, "/admin"],
  ]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/login");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(destination + "$"));
    await expect(
      page.getByRole("heading", { name: "Total reports", exact: true }),
    ).toBeVisible();
    if (destination === "/dashboard") {
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/dashboard$/);
    }
    await page.getByRole("button", { name: "Gamitin ang Filipino" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "fil");
    await expect(
      page.getByRole("heading", { name: "Lahat ng ulat", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "fil");
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page
      .getByRole("button", { name: "Mag-sign out", exact: true })
      .click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto(destination);
    await expect(page).toHaveURL(/\/login$/);
    await context.close();
  }
});
