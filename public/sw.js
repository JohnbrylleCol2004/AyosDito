/* Cache only a public, self-contained offline page. Never cache app responses. */
const CACHE_NAME = "ayosdito-offline-v2";
const OFFLINE_URL = new URL("/offline.html", self.location.origin).href;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.add(
        new Request(OFFLINE_URL, { cache: "reload", credentials: "omit" }),
      );
      await self.skipWaiting();
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(async (names) => {
      await Promise.all(
        names
          .filter(
            (name) =>
              name.startsWith("ayosdito-offline-") && name !== CACHE_NAME,
          )
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (
    request.method !== "GET" ||
    request.mode !== "navigate" ||
    new URL(request.url).origin !== self.location.origin
  )
    return;
  event.respondWith(
    fetch(request).catch(
      async () =>
        (await caches.match(OFFLINE_URL, { cacheName: CACHE_NAME })) ||
        Response.error(),
    ),
  );
});

// Verify the current signed-in account before displaying anything on a shared device.
// Server payloads carry no report content; even supplied titles/URLs are ignored.
self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let payload;
      try {
        payload = event.data?.json();
      } catch {
        return;
      }
      if (
        !payload ||
        typeof payload.subscriptionId !== "string" ||
        !/^[0-9a-f-]{36}$/i.test(payload.subscriptionId)
      )
        return;
      try {
        const response = await fetch(
          `/api/push/session?subscription=${encodeURIComponent(payload.subscriptionId)}`,
          { credentials: "include", cache: "no-store" },
        );
        if (!response.ok || (await response.json()).authorized !== true) return;
        await self.registration.showNotification("AyosDito", {
          body: "You have an update. Open AyosDito to view it. / May bagong update sa AyosDito.",
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          tag:
            typeof payload.tag === "string" ? payload.tag : "ayosdito-update",
          data: { url: "/notifications" },
        });
      } catch {
        /* No session verification, no private-device notification. */
      }
    })(),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const url = new URL("/notifications", self.location.origin).href;
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = windows.find(
        (client) => new URL(client.url).origin === self.location.origin,
      );
      if (existing) {
        await existing.navigate(url);
        await existing.focus();
      } else await self.clients.openWindow(url);
    })(),
  );
});
