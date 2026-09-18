// Happit Service Worker
// Caches application shell for offline support
// Does NOT cache authenticated API responses or private user data

const CACHE_VERSION = "happit-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Static assets to cache on install
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name.startsWith("happit-") && name !== STATIC_CACHE && name !== RUNTIME_CACHE)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch event - network first for API, cache first for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip API requests - always go to network, never cache private data
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // For navigation requests and static assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type === "error") {
            return response;
          }

          // Only cache same-origin static assets
          if (url.origin === self.location.origin) {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }

          return response;
        })
        .catch(() => {
          // If offline and no cache, return offline page for navigation
          if (request.mode === "navigate") {
            return caches.match("/index.html");
          }
          throw new Error("Network request failed and no cache available");
        });
    })
  );
});
