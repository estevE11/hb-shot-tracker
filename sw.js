// Scope cache entries to this installation, including the /dev/ preview.
const CACHE_NAME = `courtside-v2-${self.registration.scope}`;
const ASSETS = [
  "./",
  "index.html",
  "styles.css",
  "shots.js",
  "menu.js",
  "canvas.js",
  "database.js",
  "export.js",
  "lib/dexie.js",
  "hbpitch.png",
  "court.svg",
  "manifest.json",
  "icons/icon192.png",
  "icons/icon512.png",
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)),
  );
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("courtside-") &&
                key.endsWith(self.registration.scope) &&
                key !== CACHE_NAME,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    !event.request.url.startsWith(self.registration.scope)
  )
    return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, copy)),
          );
        }
        return response;
      })
      .catch(() =>
        caches
          .match(event.request)
          .then((cached) => cached || Response.error()),
      ),
  );
});
