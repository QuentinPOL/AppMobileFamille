// public/service-worker.js
self.addEventListener("install", (event) => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  return self.clients.claim();
});
// Cache "network-first" très simple
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.open("app-cache").then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        const res = await fetch(event.request);
        cache.put(event.request, res.clone());
        return res;
      } catch {
        return cached || Response.error();
      }
    })
  );
});