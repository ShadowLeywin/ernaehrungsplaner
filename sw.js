// Service Worker: hält die App-Dateien offline vor.
// Bei jeder Änderung an App-Dateien VERSION erhöhen, sonst sehen installierte Apps die Änderung nicht.
const VERSION = 'v6';
const CACHE = `ernaehrung-${VERSION}`;

// Alle Dateien der App-Hülle. Neue Dateien hier eintragen.
const DATEIEN = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/main.js',
  './js/router.js',
  './js/db.js',
  './js/state.js',
  './js/ui.js',
  './js/lebensmittel.js',
  './js/logic/naehrstoffe.js',
  './js/logic/fixeintraege.js',
  './js/logic/wasser.js',
  './js/logic/profil.js',
  './js/logic/ziele.js',
  './js/views/platzhalter.js',
  './js/views/heute.js',
  './js/views/einstellungen.js',
  './js/views/lebensmittel.js',
  './data/lebensmittel.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  // cache: 'reload' umgeht den HTTP-Cache, sonst landen bei einem Update veraltete Dateien im neuen Cache
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(DATEIEN.map((url) => new Request(url, { cache: 'reload' })))));
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

  // Lokal entwickeln: Netz zuerst, damit Änderungen sofort sichtbar sind
  if (['localhost', '127.0.0.1'].includes(location.hostname)) {
    const frisch = anfrage.mode === 'navigate' ? anfrage : new Request(anfrage, { cache: 'no-cache' });
    event.respondWith(fetch(frisch).catch(() => caches.match(anfrage, { ignoreSearch: true })));
    return;
  }

  event.respondWith(
    caches.match(anfrage, { ignoreSearch: true }).then((treffer) => treffer || fetch(anfrage)),
  );
});
