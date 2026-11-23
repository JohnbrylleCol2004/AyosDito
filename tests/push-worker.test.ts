import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
test("push worker checks the current session and ignores private payload titles/links", async () => {
  const listeners: Record<string, (event: unknown) => void> = {};
  let authorized = false;
  const shown: {
    title: string;
    options: { body: string; data: { url: string } };
  }[] = [];
  vm.runInNewContext(
    await readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
    {
      self: {
        location: { origin: "https://ayos.example" },
        addEventListener: (name: string, cb: (event: unknown) => void) => {
          listeners[name] = cb;
        },
        registration: {
          showNotification: async (
            title: string,
            options: { body: string; data: { url: string } },
          ) => {
            shown.push({ title, options });
          },
        },
      },
      fetch: async () => Response.json({ authorized }),
      URL,
      Request,
      Response,
    },
  );
  let pending: Promise<unknown> = Promise.resolve();
  const event = {
    data: {
      json: () => ({
        subscriptionId: "11111111-1111-4111-8111-111111111111",
        title: "SECRET PRIVATE TITLE",
        url: "https://evil.example",
      }),
    },
    waitUntil: (task: Promise<unknown>) => {
      pending = task;
    },
  };
  listeners.push(event);
  await pending;
  assert.equal(shown.length, 0);
  authorized = true;
  listeners.push(event);
  await pending;
  assert.equal(shown.length, 1);
  assert.equal(shown[0].title, "AyosDito");
  assert.equal(shown[0].options.data.url, "/notifications");
  assert.ok(!JSON.stringify(shown).includes("SECRET"));
});
