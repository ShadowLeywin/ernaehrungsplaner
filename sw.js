// Service Worker: hält die App-Dateien offline vor.
// Bei jeder Änderung an App-Dateien VERSION erhöhen, sonst sehen installierte Apps die Änderung nicht.
const VERSION = 'v1';
const CACHE = `ernaehrung-${VERSION}`;

// Alle Dateien der App-Hülle. Neue Dateien hier eintragen.
const DATEIEN = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/main.js',
  './js/router.js',
  './js/views/platzhalter.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(DATEIEN)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Alte Cache-Versionen aufräumen
  event.waitUntil(
    caches.keys()
      .then((namen) => Promise.all(namen.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const anfrage = event.request;
  // Nur eigene GET-Anfragen aus dem Cache bedienen; externe (z. B. Open Food Facts) gehen direkt ins Netz
  if (anfrage.method !== 'GET' || new URL(anfrage.url).origin !== location.origin) return;

  event.respondWith(
    caches.match(anfrage, { ignoreSearch: true }).then((treffer) => treffer || fetch(anfrage)),
  );
});
