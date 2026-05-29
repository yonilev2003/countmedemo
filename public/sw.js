const CACHE = "countme-v1";
const PRECACHE = ["/", "/setup", "/demo", "/dashboard", "/file", "/invoices"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // Pass API calls straight through — never cache them
  if (e.request.url.includes("/api/")) {
    e.respondWith(fetch(e.request));
    return;
  }
  // Cache-first for everything else
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
