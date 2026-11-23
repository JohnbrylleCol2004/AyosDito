import { test, expect } from "@playwright/test";
import sharp from "sharp";

test("PWA install control handles dismissal, prompt failure and completed installation", async ({
  page,
}) => {
  await page.goto("/install");
  await page.getByRole("button", { name: "Gamitin ang Filipino" }).click();
  await page.getByRole("button", { name: "Use English" }).click();
  for (const outcome of ["dismissed", "failed", "accepted"] as const) {
    await page.evaluate((choice) => {
      const event = new Event("beforeinstallprompt", { cancelable: true });
      Object.defineProperties(event, {
        prompt: {
          value: async () => {
            if (choice === "failed") throw new Error("Unavailable");
          },
        },
        userChoice: {
          value: Promise.resolve({
            outcome: choice === "failed" ? "dismissed" : choice,
          }),
        },
      });
      window.dispatchEvent(event);
    }, outcome);
    await page
      .getByRole("button", { name: "Install AyosDito", exact: true })
      .click();
    const expected =
      outcome === "dismissed"
        ? "Installation was dismissed."
        : outcome === "failed"
          ? "The install prompt could not open."
          : "Follow your browser to finish installing AyosDito.";
    await expect(page.getByRole("status")).toContainText(expected);
    await expect(
      page.getByRole("button", { name: "Install AyosDito", exact: true }),
    ).toHaveCount(0);
  }
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await expect(page.getByRole("status")).toHaveText(
    "AyosDito is installed and ready to open.",
  );
});

test("PWA manifest, icons and bilingual installation guidance are discoverable", async ({
  page,
  request,
}) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.status()).toBe(200);
  const manifest = await response.json();
  expect(manifest.name).toBe("AyosDito");
  expect(manifest.display).toBe("standalone");
  expect(manifest.scope).toBe("/");
  expect(manifest.start_url).toBe("/");
  expect(
    manifest.icons.some(
      (icon: { purpose?: string }) => icon.purpose === "maskable",
    ),
  ).toBe(true);
  for (const icon of manifest.icons) {
    const image = await request.get(icon.src);
    expect(image.status()).toBe(200);
    const metadata = await sharp(await image.body()).metadata();
    expect(`${metadata.width}x${metadata.height}`).toBe(icon.sizes);
  }
  await page.goto("/install");
  await expect(
    page.getByRole("heading", { name: "AyosDito, ready when you are." }),
  ).toBeVisible();
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  await expect(page.getByText("Android", { exact: true })).toBeVisible();
  await expect(page.getByText("Windows PC", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Gamitin ang Filipino" }).click();
  await expect(
    page.getByRole("heading", { name: "AyosDito, laging madaling buksan." }),
  ).toBeVisible();
  for (const width of [1280, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "test-results/pwa-install-mobile.png",
    fullPage: true,
  });
});

test("PWA provides a public offline screen without caching private pages", async ({
  page,
  context,
  request,
}) => {
  test.skip(
    process.env.E2E_PRODUCTION !== "1",
    "Service worker is enabled only in production.",
  );
  const script = await request.get("/sw.js");
  expect(script.status()).toBe(200);
  expect(script.headers()["cache-control"]).toContain("no-cache");
  await page.goto("/install");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await page.goto("/login");
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  const cached = await page.evaluate(async () => {
    const entries = [];
    for (const name of await caches.keys())
      for (const item of await (await caches.open(name)).keys())
        entries.push(new URL(item.url).pathname);
    return entries;
  });
  expect(cached).toEqual(["/offline.html"]);
  await context.setOffline(true);
  await page.goto("/reports/private-test");
  await expect(
    page.getByRole("heading", { name: "You’re offline." }),
  ).toBeVisible();
  await expect(
    page.getByText("Wala kang koneksiyon.", { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 800 });
  await page.screenshot({
    path: "test-results/pwa-offline-mobile.png",
    fullPage: true,
  });
  await context.setOffline(false);
  await page.getByRole("link", { name: "Try again / Subukan muli" }).click();
  await expect(page).toHaveURL(/\/login$/);
});
