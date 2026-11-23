import { test } from "node:test";
import assert from "node:assert/strict";
import {
  monthRange,
  csvCell,
  monthlyCsv,
  parseExportRequest,
} from "../src/lib/exports/format.ts";
import { buildMonthlyPdf } from "../src/lib/exports/pdf.ts";
import { PDFDocument } from "pdf-lib";
test("exports bound months to canonical Manila ranges and reject malformed requests", () => {
  assert.deepEqual(monthRange("2026-12"), {
    start: "2026-12-01T00:00:00+08:00",
    end: "2027-01-01T00:00:00+08:00",
  });
  for (const m of [
    "2026-00",
    "2026-13",
    "2026-1",
    "0000-01",
    "10000-01",
    "2026-11\n",
    "abc",
  ])
    assert.equal(monthRange(m), null);
  assert.equal(
    parseExportRequest(new URLSearchParams("month=2026-11&format=x")),
    null,
  );
  assert.equal(
    parseExportRequest(
      new URLSearchParams("month=2026-11&format=csv&locale=fil"),
    )?.locale,
    "fil",
  );
});
test("CSV neutralizes spreadsheet formulas including whitespace prefixes and preserves quoted Unicode", () => {
  for (const s of [
    "=SUM(A1)",
    " +1",
    "-2",
    "@cmd",
    "\tFormula",
    "\n=1",
    "\r=1",
    "  \t=1",
  ])
    assert.match(csvCell(s), /^"'/);
  assert.equal(csvCell('Mañana, "ayos"'), '"Mañana, ""ayos"""');
  const csv = monthlyCsv(
    [
      {
        tracking_no: "AY-1",
        title: '=HYPERLINK("bad")',
        category: "road",
        zone: "North",
        status: "resolved",
        created_at: "2026-11-01T00:00:00Z",
      },
    ],
    "en",
  );
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes("\"'=HYPERLINK"));
  assert.ok(!csv.includes("undefined"));
});
test("PDF is a bounded one-page summary for both languages without private report data", async () => {
  for (const locale of ["en", "fil"] as const) {
    const bytes = await buildMonthlyPdf(
      "2026-11",
      {
        total: 10,
        statuses: {
          pending_review: 2,
          in_progress: 3,
          resolved: 4,
          rejected: 1,
        },
        categories: { road: 10 },
      },
      locale,
    );
    const pdf = await PDFDocument.load(bytes);
    assert.equal(pdf.getPageCount(), 1);
    assert.match(pdf.getTitle() ?? "", /2026-11/);
    assert.ok(bytes.length > 1000);
  }
});
