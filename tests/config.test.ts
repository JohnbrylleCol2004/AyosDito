import { test } from "node:test";
import assert from "node:assert/strict";
import { supabaseConfig } from "../src/lib/supabase/config.ts";

test("nonempty but invalid Supabase URLs require setup", (t) => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  t.after(() => {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined)
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = previousKey;
  });
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "public-test-value";
  for (const url of [
    "project.supabase.co",
    "not-a-url",
    "https//project.supabase.co",
    "ftp://project.supabase.co",
  ]) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = url;
    assert.equal(supabaseConfig(), null);
  }
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
  assert.ok(supabaseConfig());
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
  assert.ok(supabaseConfig());
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  assert.equal(supabaseConfig(), null);
});
