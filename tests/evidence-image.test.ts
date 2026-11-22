import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import {
  prepareEvidence,
  EvidenceError,
  MAX_EVIDENCE_BYTES,
  evidenceRequestKey,
} from "../src/lib/evidence/image.ts";

test("evidence decodes and re-encodes allowed formats without image metadata", async () => {
  for (const format of ["jpeg", "png", "webp"] as const) {
    const input = await sharp({
      create: { width: 12, height: 8, channels: 3, background: "green" },
    })
      [format]()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const file = new File([new Uint8Array(input)], "test." + format, {
      type: "image/" + format,
    });
    const prepared = await prepareEvidence(file);
    const metadata = await sharp(prepared.bytes).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.exif, undefined);
    assert.equal(metadata.orientation, undefined);
    assert.ok(prepared.bytes.byteLength <= MAX_EVIDENCE_BYTES);
  }
});
test("spoofed, unsupported, truncated and oversized images are rejected", async () => {
  const good = await sharp({
    create: { width: 2, height: 2, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  for (const file of [
    new File(["not an image"], "fake.jpg", { type: "image/jpeg" }),
    new File([new Uint8Array(good)], "spoof.jpg", { type: "image/jpeg" }),
    new File([new Uint8Array(good)], "image.svg", { type: "image/svg+xml" }),
    new File([new Uint8Array(MAX_EVIDENCE_BYTES + 1)], "huge.png", {
      type: "image/png",
    }),
  ]) {
    await assert.rejects(() => prepareEvidence(file), EvidenceError);
  }
});
test("upload request identity is stable for retries and changes for different images", () => {
  assert.equal(
    evidenceRequestKey("batch", 0, "digest"),
    evidenceRequestKey("batch", 0, "digest"),
  );
  assert.notEqual(
    evidenceRequestKey("batch", 0, "digest"),
    evidenceRequestKey("batch", 1, "digest"),
  );
  assert.notEqual(
    evidenceRequestKey("batch", 0, "digest"),
    evidenceRequestKey("batch", 0, "other"),
  );
  assert.match(
    evidenceRequestKey("batch", 0, "digest"),
    /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/,
  );
});
