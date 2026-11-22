import { test } from "node:test";
import assert from "node:assert/strict";
import {
  homeForRole,
  parseCredentials,
  canAccessAdmin,
} from "../src/lib/auth/rules.ts";

test("only the database admin role permits admin access", () => {
  assert.equal(canAccessAdmin("admin"), true);
  for (const role of ["resident", "ADMIN", "", undefined, null, "superadmin"]) {
    assert.equal(canAccessAdmin(role), false);
  }
});
test("unknown roles do not receive a dashboard", () => {
  assert.equal(homeForRole("admin"), "/admin");
  assert.equal(homeForRole("resident"), "/dashboard");
  assert.equal(homeForRole("owner"), null);
});
test("normalizes email but preserves password whitespace", () => {
  assert.deepEqual(
    parseCredentials(" Resident@Example.com ", " password with spaces "),
    {
      ok: true,
      email: "resident@example.com",
      password: " password with spaces ",
    },
  );
});
test("rejects missing, malformed, oversized and non-string input", () => {
  for (const [email, password] of [
    ["", "x"],
    ["no-email", "x"],
    ["a@b.com", ""],
    [null, "x"],
    ["a@b.com", 2],
    ["a".repeat(255) + "@b.com", "x"],
    ["a@b.com", "x".repeat(1025)],
  ]) {
    assert.equal(parseCredentials(email, password).ok, false);
  }
});
