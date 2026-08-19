// countme service worker.
// Network-first so every Vercel deploy is seen immediately — the previous
// cache-first version (countme-v1) kept serving the pre-rebrand HTML/CSS to
// returning visitors, which hid the Brand Kit. Bumping the cache name makes
// `activate` purge every old cache exactly once.
//
// FP-28 (2026-08-19): the network-first rule above was ALSO catching hashed,
// content-addressed /_next/static/ chunks and /_next/image responses — those
// are immutable-by-construction (a new deploy ships a new hash/URL, it never
// overwrites an old one), so forcing a network round-trip for them on every
// page load was pure latency with no freshness benefit, worst on mobile.
// Added a cache-first branch for those two prefixes below, ahead of the
// network-first logic. Bumped CACHE so deployed clients pick up this SW.
const CACHE = "countme-v3";

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

  // Cache-first for hashed, content-addressed Next.js assets: filenames under
  // /_next/static/ embed a content hash and /_next/image responses are keyed
  // by their (url, width, quality) query — both are immutable, so a cache hit
  // is always correct and skips a real network RTT per asset per page load
  // (the win this fixes: on mobile that's one RTT per hashed chunk, every load).
  // A cold cache falls through to network and populates the cache for next time.
  if (req.url.includes("/_next/static/") || req.url.includes("/_next/image")) {
    e.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
      )
    );
    return;
  }

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
