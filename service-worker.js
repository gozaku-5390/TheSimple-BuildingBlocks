self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('simple-game-cache').then(cache => {
      return cache.addAll([
        './index.html',
        './style.css',
        './main.js',
        './manifest.json'
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
