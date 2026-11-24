import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canonicalSiteUrl,
  homeForProfile,
  parseRegistration,
  parseMemberReview,
  safeAuthNext,
} from "../src/lib/auth/accounts.ts";
test("registration validates credentials, Unicode lengths and password confirmation", () => {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    email: "RESIDENT@example.test",
    password: "A unique passphrase!",
    confirm_password: "A unique passphrase!",
    full_name: "  José Reyes  ",
    zone: "Purok 1",
  }))
    form.set(key, value);
  assert.deepEqual(parseRegistration(form), {
    ok: true,
    email: "resident@example.test",
    password: "A unique passphrase!",
    full_name: "José Reyes",
    zone: "Purok 1",
  });
  form.set("full_name", "😀".repeat(120));
  assert.equal(parseRegistration(form).ok, true);
  form.set("full_name", "😀".repeat(121));
  assert.deepEqual(parseRegistration(form), { ok: false, field: "name" });
  form.set("full_name", "José");
  form.set("zone", " ");
  assert.deepEqual(parseRegistration(form), { ok: false, field: "zone" });
  form.set("zone", "1");
  form.set("confirm_password", "different");
  assert.deepEqual(parseRegistration(form), { ok: false, field: "confirm" });
  form.set("password", "short");
  assert.deepEqual(parseRegistration(form), { ok: false, field: "password" });
});
test("approval routing and email destinations cannot bypass approval or escape the canonical origin", () => {
  assert.equal(
    homeForProfile({ role: "resident", approval_status: "pending" }),
    "/account-pending",
  );
  assert.equal(
    homeForProfile({ role: "resident", approval_status: "rejected" }),
    "/account-pending",
  );
  assert.equal(
    homeForProfile({ role: "resident", approval_status: "approved" }),
    "/dashboard",
  );
  for (const value of [
    "//evil.test",
    "https://evil.test",
    "/admin",
    "/auth/reset-password?next=//evil.test",
    null,
  ])
    assert.equal(safeAuthNext(value), "/account-pending");
  assert.equal(safeAuthNext("/auth/reset-password"), "/auth/reset-password");
  assert.equal(canonicalSiteUrl({ NODE_ENV: "production" }), null);
  assert.equal(
    canonicalSiteUrl({ NODE_ENV: "production", SITE_URL: "https://ayos.test" }),
    "https://ayos.test",
  );
  for (const SITE_URL of [
    "http://ayos.test",
    "https://user:secret@ayos.test",
    "https://ayos.test/path",
    "https://ayos.test?redirect=evil",
  ])
    assert.equal(canonicalSiteUrl({ NODE_ENV: "production", SITE_URL }), null);
});
test("member review accepts only typed decisions and bounded notes", () => {
  const form = new FormData();
  form.set("user_id", "11111111-1111-4111-8111-111111111111");
  form.set("decision", "approve");
  form.set("note", " Reviewed ");
  assert.deepEqual(parseMemberReview(form), {
    p_user_id: "11111111-1111-4111-8111-111111111111",
    p_approved: true,
    p_note: "Reviewed",
  });
  form.set("decision", "admin");
  assert.equal(parseMemberReview(form), null);
  form.set("decision", "reject");
  form.set("note", "x".repeat(1001));
  assert.equal(parseMemberReview(form), null);
});

test("email URLs use Vercel's production domain when SITE_URL is absent, never preview hosts", () => {
  assert.equal(
    canonicalSiteUrl({
      NODE_ENV: "production",
      VERCEL_PROJECT_PRODUCTION_URL: "ayosdito.vercel.app",
    }),
    "https://ayosdito.vercel.app",
  );
  assert.equal(
    canonicalSiteUrl({
      NODE_ENV: "production",
      SITE_URL: "https://custom.example",
      VERCEL_PROJECT_PRODUCTION_URL: "ayosdito.vercel.app",
    }),
    "https://custom.example",
  );
  assert.equal(
    canonicalSiteUrl({
      NODE_ENV: "production",
      SITE_URL: "  ",
      VERCEL_PROJECT_PRODUCTION_URL: "ayosdito.vercel.app",
    }),
    "https://ayosdito.vercel.app",
  );
  assert.equal(
    canonicalSiteUrl({
      NODE_ENV: "production",
      VERCEL_URL: "preview.vercel.app",
    }),
    null,
  );
  for (const host of [
    "evil.example/path",
    "user@evil.example",
    "evil.example?next=elsewhere",
    "https://evil.example",
    "//evil.example",
  ])
    assert.equal(
      canonicalSiteUrl({
        NODE_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: host,
      }),
      null,
    );
});
