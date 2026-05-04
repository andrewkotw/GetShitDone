const APP_VERSION = "2026.05.04-1";
const CACHE_PREFIX = "get-shit-done";
const CACHE_NAME = `${CACHE_PREFIX}-${APP_VERSION}`;

const APP_SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-192-maskable.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_FILES))
  );

  // Do not call skipWaiting() automatically here.
  // Let the browser install the new worker and activate it on the next clean reload.
  // This avoids surprising users in the middle of an active mission.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX))
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );

  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request, "./index.html"));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

async function networkFirst(request, fallbackPath) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const freshResponse = await fetch(request);

    if (freshResponse && freshResponse.ok) {
      cache.put(request, freshResponse.clone());
    }

    return freshResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    const fallbackResponse = await cache.match(fallbackPath);

    return cachedResponse || fallbackResponse || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const freshResponse = await fetch(request);

  if (freshResponse && freshResponse.ok) {
    cache.put(request, freshResponse.clone());
  }

  return freshResponse;
}
