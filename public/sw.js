// Minimal hand-rolled service worker - no next-pwa or workbox dependency,
// same "no heavier lib than needed" approach as this repo's hand-rolled
// i18n. Two jobs only: (1) satisfy the browser's PWA installability
// criteria (a registered SW with a fetch handler), (2) show something
// better than the browser's default error page when there's no network.
//
// Deliberately NOT caching /api/* responses or page HTML - this app is
// almost entirely live data (cart, wallet balance, order status, OTP...),
// so serving a stale cached response would be actively misleading. Bump
// CACHE_NAME whenever the precached list below changes, so old clients
// don't get stuck on a stale cache forever.
const CACHE_NAME = "ocass-shell-v1";
const PRECACHE_URLS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // leave Google Fonts etc. to the browser's own HTTP cache
  if (url.pathname.startsWith("/api/")) return; // never cache live API data

  // Full-page navigations: always prefer the network (freshest app code +
  // data); only fall back to the offline page when there's no connection.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
    return;
  }

  // Static assets (Next's hashed /_next/static/* build output, icons,
  // images): cache-first, since a hashed filename never changes content -
  // safe to serve from cache indefinitely once fetched once.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
    )
  );
});
