// countme service worker.
// Network-first so every Vercel deploy is seen immediately — the previous
// cache-first version (countme-v1) kept serving the pre-rebrand HTML/CSS to
// returning visitors, which hid the Brand Kit. Bumping the cache name makes
// `activate` purge every old cache exactly once.
const CACHE = "countme-v2";

self.addEventListener("install", () => {
  // Take over without waiting for old tabs to close.
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k)))) // wipe ALL old caches
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  // Let non-GET and API calls hit the network directly — never cache them.
  if (req.method !== "GET" || req.url.includes("/api/")) return;

  // Network-first: always try the live deploy, fall back to cache only offline.
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
