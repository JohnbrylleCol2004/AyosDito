import { test } from "node:test";
import assert from "node:assert/strict";
import { formatReportDate } from "../src/lib/format.ts";

test("report dates use Manila time in English and Filipino, with optional time", () => {
  const value = "2026-11-23T16:30:00Z";
  assert.equal(formatReportDate(value, "en"), "Nov 24, 2026");
  assert.equal(formatReportDate(value, "fil"), "Nob 24, 2026");
  assert.equal(formatReportDate(value, "en", true), "Nov 24, 2026, 12:30 AM");
  assert.equal(formatReportDate(value, "fil", true), "Nob 24, 2026, 12:30 AM");
  assert.throws(() => formatReportDate("invalid", "en"), RangeError);
});
