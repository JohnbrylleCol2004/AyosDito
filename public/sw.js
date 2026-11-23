/* Cache only a public, self-contained offline page. Never cache app responses. */
const CACHE_NAME = "ayosdito-offline-v1";
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
