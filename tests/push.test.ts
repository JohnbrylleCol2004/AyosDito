import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePushSubscription } from "../src/lib/push/validation.ts";

const keys = {
  p256dh: Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 7)]).toString(
    "base64url",
  ),
  auth: Buffer.alloc(16, 8).toString("base64url"),
};
test("push subscriptions accept only approved HTTPS push services and canonical key bytes", () => {
  assert.ok(
    parsePushSubscription({
      endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint",
      keys,
    }),
  );
  for (const endpoint of [
    "http://fcm.googleapis.com/fcm/send/a",
    "https://127.0.0.1/internal",
    "https://fcm.googleapis.com.evil.example/send",
    "https://fcm.googleapis.com:444/send",
    "https://user@fcm.googleapis.com/send",
    "https://localhost/a",
    "https://fcm.googleapis.com/send#token",
  ]) {
    assert.equal(parsePushSubscription({ endpoint, keys }), null);
  }
  assert.equal(
    parsePushSubscription({
      endpoint: "https://fcm.googleapis.com/send",
      keys: { ...keys, auth: "invalid" },
    }),
    null,
  );
  assert.equal(parsePushSubscription(null), null);
});
