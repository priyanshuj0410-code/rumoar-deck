/* RUMOAR service worker — offline shell + image cache. */
const VERSION = "v1";
const SHELL = `rumoar-shell-${VERSION}`;
const IMAGES = `rumoar-img-${VERSION}`;
const FONTS = `rumoar-font-${VERSION}`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll([OFFLINE_URL, "/manifest.webmanifest"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL, IMAGES, FONTS]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
    if (maxEntries) {
      const keys = await cache.keys();
      // Cheap FIFO trim; a wardrobe of a few hundred images never needs LRU.
      for (const key of keys.slice(0, Math.max(0, keys.length - maxEntries))) {
        cache.delete(key);
      }
    }
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache auth or model traffic.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  if (request.destination === "image") {
    event.respondWith(cacheFirst(request, IMAGES, 300).catch(() => Response.error()));
    return;
  }

  if (request.destination === "font" || request.destination === "style") {
    event.respondWith(cacheFirst(request, FONTS).catch(() => Response.error()));
  }
});
