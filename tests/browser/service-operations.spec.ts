import { test, expect } from "@playwright/test";
import { accountsDictionary } from "../../src/lib/i18n/accounts";

test("real resident registration validates before sending email and translates errors", async ({
  page,
}) => {
  const t = accountsDictionary("en");
  await page.goto("/register");
  await expect(page.getByRole("heading", { name: t.register })).toBeVisible();
  await page
    .locator('[name="full_name"]')
    .fill("Fictional registration validation");
  await page.locator('[name="zone"]').fill("Test zone");
  await page.locator('[name="email"]').fill("validation@example.test");
  await page.locator('[name="password"]').fill("short");
  await page.locator('[name="confirm_password"]').fill("short");
  await page.locator("form.login-form").evaluate((form: HTMLFormElement) => {
    form.noValidate = true;
  });
  await page.getByRole("button", { name: t.submit, exact: true }).click();
  await expect(
    page.locator("form.login-form").getByRole("alert"),
  ).toContainText(t.errors.password);
  await page.getByRole("button", { name: "Gamitin ang Filipino" }).click();
  await expect(
    page.locator("form.login-form").getByRole("alert"),
  ).toContainText(accountsDictionary("fil").errors.password);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
test("new admin functions stay protected and push does not trust signed-out clients", async ({
  page,
  request,
}) => {
  for (const route of ["/admin/members", "/admin/exports"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
  }
  const delivery = await request.post("/api/push/deliver");
  expect(delivery.status()).toBe(401);
  const session = await request.get(
    "/api/push/session?subscription=11111111-1111-4111-8111-111111111111",
  );
  expect(await session.json()).toEqual({ authorized: false });
});
