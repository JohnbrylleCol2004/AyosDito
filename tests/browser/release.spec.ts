import { test, expect } from "@playwright/test";

test("public responses keep security headers and evidence rejects foreign or absent origins", async ({
  request,
  baseURL,
}) => {
  const response = await request.get("/login");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["referrer-policy"]).toBe(
    "strict-origin-when-cross-origin",
  );
  expect(response.headers()["x-powered-by"]).toBeUndefined();
  const id = "00000000-0000-4000-8000-000000000000";
  const origins: Record<string, string>[] = [
    { Origin: "https://foreign.example" },
    {},
  ];
  for (const headers of origins) {
    const denied = await request.post(`/api/reports/${id}/evidence`, {
      headers,
    });
    expect(denied.status()).toBe(403);
    expect(await denied.json()).toEqual({ error: "csrf" });
  }
  const signedOut = await request.post(`/api/reports/${id}/evidence`, {
    headers: { Origin: baseURL! },
  });
  expect(signedOut.status()).toBe(401);
  expect(await signedOut.json()).toEqual({ error: "permission" });
});
