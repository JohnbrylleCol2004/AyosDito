import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateReport,
  parseReportFilters,
  reportListUrl,
} from "../src/lib/validations/reports.ts";

const valid = {
  title: "Broken streetlight",
  description: "The streetlight beside the fictional park is broken.",
  category: "streetlight",
  zone: "Purok Demo",
  location_details: "",
  submission_key: "11111111-1111-4111-8111-111111111111",
};

test("report validation trims input and accepts exact bounds and Unicode characters", () => {
  const result = validateReport({
    ...valid,
    title: "  " + "💡".repeat(120) + "  ",
    description: "x".repeat(20),
    location_details: "x".repeat(200),
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(Array.from(result.values.title).length, 120);
});
test("report validation rejects missing and forged values and every field boundary", () => {
  for (const [field, value] of [
    ["title", "tiny"],
    ["title", "x".repeat(121)],
    ["description", "x".repeat(19)],
    ["description", "x".repeat(2001)],
    ["category", "facilities"],
    ["category", "invalid"],
    ["zone", "   "],
    ["zone", "x".repeat(81)],
    ["location_details", "x".repeat(201)],
    ["submission_key", "not-uuid"],
    ["title", null],
  ] as const) {
    const result = validateReport({ ...valid, [field]: value });
    assert.equal(result.ok, false, field);
    if (!result.ok) assert.ok(result.errors[field]);
  }
});
test("only declared report fields survive validation", () => {
  const result = validateReport({
    ...valid,
    reporter_id: "another-user",
    status: "resolved",
    tracking_no: "AY-evil",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal("reporter_id" in result.values, false);
    assert.equal("status" in result.values, false);
  }
});
test("filters preserve literal punctuation and bound paging and search length", () => {
  const filters = parseReportFilters({
    q: "light),reporter_id.neq.secret%_*",
    category: "invalid",
    status: "resolved",
    sort: "evil",
    page: "-1",
  });
  assert.equal(filters.category, "");
  assert.equal(filters.status, "resolved");
  assert.equal(filters.sort, "newest");
  assert.equal(filters.page, 1);
  assert.equal(filters.q, "light),reporter_id.neq.secret%_*");
  assert.equal(
    parseReportFilters({ q: "Broken light (park)" }).q,
    "Broken light (park)",
  );
  assert.equal(parseReportFilters({ page: "1e9" }).page, 1);
  assert.equal(parseReportFilters({ page: "9999999999999999999999" }).page, 1);
  assert.ok(parseReportFilters({ q: "x".repeat(300) }).q.length <= 120);
  assert.match(reportListUrl({ ...filters, page: 2 }), /page=2/);
});
