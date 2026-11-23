import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCoordinates } from "../src/components/maps/coordinates.ts";
test("optional map coordinates require a complete finite pair in geographic bounds", () => {
  assert.deepEqual(parseCoordinates("", ""), {
    latitude: null,
    longitude: null,
  });
  assert.deepEqual(parseCoordinates("14.123456", "121.654321"), {
    latitude: 14.123456,
    longitude: 121.654321,
  });
  for (const pair of [
    ["", "1"],
    ["1", ""],
    ["NaN", "1"],
    ["Infinity", "1"],
    ["91", "0"],
    ["0", "-181"],
    ["0x10", "20"],
    ["1e2", "0"],
  ])
    assert.equal(parseCoordinates(...(pair as [string, string])), null);
  assert.deepEqual(parseCoordinates("-90", "180"), {
    latitude: -90,
    longitude: 180,
  });
});
