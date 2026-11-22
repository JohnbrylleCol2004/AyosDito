import { test } from "node:test";
import assert from "node:assert/strict";
import {
  allowedTransitions,
  validateStatusChange,
  parseAdminFilters,
} from "../src/lib/validations/status-transitions.ts";

test("only approved lifecycle edges are offered", () => {
  assert.deepEqual(allowedTransitions("pending_review"), [
    "in_progress",
    "rejected",
  ]);
  assert.deepEqual(allowedTransitions("in_progress"), ["resolved"]);
  assert.deepEqual(allowedTransitions("resolved"), []);
  assert.deepEqual(allowedTransitions("rejected"), []);
});
test("status actions validate IDs, versions, confirmation and Unicode note bounds", () => {
  const valid = {
    report_id: "11111111-1111-4111-8111-111111111111",
    target: "in_progress",
    note: "Accepted for repair.",
    version: "0",
    confirmed: "yes",
  };
  assert.equal(validateStatusChange(valid).ok, true);
  assert.equal(
    validateStatusChange({ ...valid, note: "💡".repeat(2000) }).ok,
    true,
  );
  for (const changed of [
    { report_id: "bad" },
    { version: "-1" },
    { version: "1.5" },
    { version: "9007199254740992" },
    { target: "pending_review" },
    { target: "forged" },
    { note: "\u00a0\ufeff" },
    { note: "x".repeat(2001) },
    { confirmed: "no" },
  ]) {
    assert.equal(validateStatusChange({ ...valid, ...changed }).ok, false);
  }
});
test("admin filters preserve literal search and bound zone and paging", () => {
  const result = parseAdminFilters({
    q: "Light (park) %_",
    zone: " Purok 1 ",
    sort: "pending",
    page: "2",
  });
  assert.equal(result.q, "Light (park) %_");
  assert.equal(result.zone, "Purok 1");
  assert.equal(result.sort, "pending");
  assert.equal(parseAdminFilters({ zone: "x".repeat(100) }).zone.length, 80);
  assert.equal(parseAdminFilters({ page: "999999999999" }).page, 1);
});
