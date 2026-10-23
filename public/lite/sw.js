const CACHE_NAME = "dogeub-lite-v1";
const STATIC_PATHS = ["/lite/index.html", "/lite/manifest.webmanifest", "/logo-os.svg"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_PATHS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("dogeub-lite-") && key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/messages")) return;
  const staticAsset = request.destination === "script" || request.destination === "style" || request.destination === "font" || request.destination === "image";
  const inLite = url.pathname.startsWith("/lite/");
  if (!inLite && !staticAsset) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) {
      if (navigator.onLine) fetch(request).then((response) => {
        if (response.ok && response.type === "basic") cache.put(request, response.clone());
      }).catch(() => {});
      return cached;
    }
    try {
      const response = await fetch(request);
      if (response.ok && response.type === "basic") await cache.put(request, response.clone());
      return response;
    } catch (error) {
      if (request.mode === "navigate") {
        const offlinePage = await cache.match("/lite/index.html");
        if (offlinePage) return offlinePage;
      }
      throw error;
    }
  })());
});
