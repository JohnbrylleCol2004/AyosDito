import { test, expect } from "@playwright/test";
import { supabaseConfig } from "../../src/lib/supabase/config";

test("development forwarding accepts the reported localhost origin and rejects foreign origins", async ({
  page,
}) => {
  test.skip(
    process.env.E2E_PRODUCTION === "1",
    "Localhost forwarding is allowed only in development.",
  );
  test.skip(!supabaseConfig(), "Requires a configured login page.");
  const tunnel = "xj7hfvk5-3000.asse.devtunnels.ms";
  await page.route("**/login", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const response = await route.fetch({
      headers: {
        ...route.request().headers(),
        origin: "http://localhost:3000",
        "x-forwarded-host": tunnel,
      },
    });
    return route.fulfill({ response });
  });
  await page.goto("/login");
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/login",
  );
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  await expect(page.locator("#email-error")).toHaveText(
    "Enter a valid email address.",
  );
  const submitted = response.request();
  const denied = await page.request.post("/login", {
    headers: {
      ...submitted.headers(),
      origin: "https://foreign.example",
      "x-forwarded-host": tunnel,
    },
    data: submitted.postDataBuffer()!,
  });
  expect(denied.status()).toBe(500);
});
