// public/service-worker.js

// injecté par le script de build (on remplace ce token par un timestamp)
const CACHE_NAME = "app-cache-__BUILD_TS__";

// Permet au client de demander l'activation immédiate
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Installe et passe direct en "waiting"
self.addEventListener("install", () => {
  self.skipWaiting();
});

// Prend le contrôle immédiatement et nettoie les vieux caches
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k.startsWith("app-cache-") && k !== CACHE_NAME).map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// Politique de fetch :
// - HTML (navigations) : réseau d'abord (pas de cache offline pour le HTML → version fraîche)
// - Autres ressources (JS/CSS/images) : network-first + fallback cache
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const accept = req.headers.get("accept") || "";

  const isHTML = req.mode === "navigate" || accept.includes("text/html");
  if (isHTML) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, res.clone());
      return res;
    } catch {
      const cached = await caches.match(req);
      if (cached) return cached;
      throw new Error("Network error and no cache");
    }
  })());
});