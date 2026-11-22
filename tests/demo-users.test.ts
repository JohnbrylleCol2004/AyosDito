import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

test("demo provisioning rejects invalid URLs before network access with safe setup instructions", () => {
  const secret = randomUUID();
  const password = randomUUID();
  for (const url of [
    "not-a-project-url",
    "project.supabase.co",
    "ftp://project.supabase.co",
  ]) {
    const result = spawnSync(
      process.execPath,
      ["scripts/create-demo-users.mjs"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: url,
          SUPABASE_SECRET_KEY: secret,
          DEMO_RESIDENT_EMAIL: "resident@example.test",
          DEMO_RESIDENT_PASSWORD: password,
          DEMO_ADMIN_EMAIL: "admin@example.test",
          DEMO_ADMIN_PASSWORD: password,
        },
      },
    );
    assert.equal(result.status, 1);
    const output = result.stdout + result.stderr;
    assert.match(output, /NEXT_PUBLIC_SUPABASE_URL/);
    assert.match(output, /Project URL/);
    assert.match(output, /\.env\.local/);
    assert.match(output, /No accounts were created/);
    assert.doesNotMatch(output, /node_modules|at new SupabaseClient/);
    assert.equal(output.includes(secret), false);
    assert.equal(output.includes(password), false);
  }
});
