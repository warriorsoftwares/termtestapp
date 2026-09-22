const CACHE_NAME = "masters-quizzes-v6";

const FILES_TO_CACHE = [
  "/termtestapp/",
  "/termtestapp/index.html",
  "/termtestapp/style.css",
  "/termtestapp/script.js",
  "/termtestapp/manifest.json",
  "/termtestapp/globe.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        // update cache with new files when online
        if (response && response.status === 200 && event.request.method === "GET") {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => cached);

      // prefer network first, fallback to cache (better for updates)
      return networkFetch;
    })
  );
});