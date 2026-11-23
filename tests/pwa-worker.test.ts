import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

async function worker() {
  type WorkerEvent = {
    waitUntil(promise: Promise<unknown>): void;
    request: { method: string; mode: string; url: string };
    respondWith(response: Promise<Response>): void;
  };
  const listeners: Record<string, (event: Partial<WorkerEvent>) => void> = {};
  const stored: string[] = [];
  const removed: string[] = [];
  let online = true;
  const context = {
    self: {
      location: { origin: "https://ayos.example" },
      addEventListener: (
        name: string,
        callback: (event: Partial<WorkerEvent>) => void,
      ) => {
        listeners[name] = callback;
      },
      skipWaiting: async () => {},
      clients: { claim: async () => {} },
    },
    caches: {
      open: async () => ({
        add: async (request: Request) => {
          stored.push(request.url);
        },
      }),
      keys: async () => ["ayosdito-offline-obsolete", "unrelated-cache"],
      delete: async (name: string) => {
        removed.push(name);
        return true;
      },
      match: async () => new Response("Public offline fallback"),
    },
    fetch: async () => {
      if (!online) throw new Error("offline");
      return new Response("Private network response");
    },
    Request,
    Response,
    URL,
  };
  vm.runInNewContext(
    await readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
    context,
  );
  return {
    listeners,
    stored,
    removed,
    offline: () => {
      online = false;
    },
  };
}

test("PWA worker caches only its public offline document and preserves unrelated caches", async () => {
  const app = await worker();
  let pending: Promise<unknown> = Promise.resolve();
  app.listeners.install({
    waitUntil: (promise: Promise<unknown>) => {
      pending = promise;
    },
  });
  await pending;
  assert.deepEqual(app.stored, ["https://ayos.example/offline.html"]);
  app.listeners.activate({
    waitUntil: (promise: Promise<unknown>) => {
      pending = promise;
    },
  });
  await pending;
  assert.deepEqual(app.removed, ["ayosdito-offline-obsolete"]);
});

test("PWA worker never intercepts mutations, RSC, APIs or cross-origin evidence", async () => {
  const app = await worker();
  for (const request of [
    { method: "POST", mode: "navigate", url: "https://ayos.example/login" },
    {
      method: "GET",
      mode: "cors",
      url: "https://ayos.example/dashboard?_rsc=private",
    },
    {
      method: "GET",
      mode: "cors",
      url: "https://ayos.example/api/reports/private/evidence",
    },
    {
      method: "GET",
      mode: "navigate",
      url: "https://storage.example/private.webp",
    },
  ]) {
    let intercepted = false;
    app.listeners.fetch({
      request,
      respondWith: () => {
        intercepted = true;
      },
    });
    assert.equal(intercepted, false);
  }
  assert.deepEqual(app.stored, []);
});

test("PWA navigation uses the network and falls back without caching private responses", async () => {
  const app = await worker();
  const request = {
    method: "GET",
    mode: "navigate",
    url: "https://ayos.example/reports/private",
  };
  let pending: Promise<Response> | undefined;
  const event = {
    request,
    respondWith: (response: Promise<Response>) => {
      pending = response;
    },
  };
  app.listeners.fetch(event);
  assert.equal(await (await pending!).text(), "Private network response");
  app.offline();
  app.listeners.fetch(event);
  assert.equal(await (await pending!).text(), "Public offline fallback");
  assert.deepEqual(app.stored, []);
});
