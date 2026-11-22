import { test } from "node:test";
import assert from "node:assert/strict";
import { dictionary, en, fil } from "../src/lib/i18n/dictionaries.ts";

test("Filipino covers every UI label and sign-in error", () => {
  assert.deepEqual(Object.keys(fil).sort(), Object.keys(en).sort());
  assert.deepEqual(
    Object.keys(fil.errors).sort(),
    Object.keys(en.errors).sort(),
  );
  for (const value of Object.values(fil))
    assert.ok(
      typeof value === "string"
        ? value.length > 0
        : Object.keys(value).length > 0,
    );
  assert.equal(dictionary("fil"), fil);
  assert.equal(dictionary("untrusted-cookie"), en);
});
