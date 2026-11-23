import assert from "node:assert/strict";
import { test } from "node:test";
import { hasSameOrigin } from "../src/lib/evidence/origin.ts";

test("evidence origin follows incoming host, including ports, and rejects foreign origins", () => {
  assert.equal(hasSameOrigin("http://127.0.0.1:3100", "127.0.0.1:3100"), true);
  assert.equal(hasSameOrigin("https://ayos.example", "ayos.example"), true);
  for (const origin of [
    null,
    "null",
    "https://evil.example",
    "http://127.0.0.1:3000",
    "https://ayos.example/path",
    "https://ayos.example@evil.example",
  ]) {
    assert.equal(hasSameOrigin(origin, "ayos.example"), false);
  }
  assert.equal(hasSameOrigin("https://ayos.example", null), false);
});
