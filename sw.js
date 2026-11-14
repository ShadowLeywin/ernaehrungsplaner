// Service Worker: hält die App offline bereit.
// Bei JEDER Änderung an einer App-Datei VERSION erhöhen, sonst sehen installierte Geräte die Änderung nicht.
// Neue Dateien in DATEIEN eintragen. Der Test test/sw.test.js prüft, dass die Liste vollständig ist.
const VERSION = 'v5';
const CACHE = `elan-${VERSION}`;

const DATEIEN = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './schrift/bricolage-grotesque.woff2',
  './data/zutaten-basis.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './js/main.js',
  './js/router.js',
  './js/db.js',
  './js/speicher.js',
  './js/ui.js',
  './js/darstellung.js',
  './js/off-abruf.js',
  './js/logik/schema.js',
  './js/logik/naehrwerte.js',
  './js/logik/datum.js',
  './js/logik/ziele.js',
  './js/logik/suche.js',
  './js/logik/zutat.js',
  './js/logik/off.js',
  './js/logik/backup.js',
  './js/logik/scheibe.js',
  './js/logik/rezepte.js',
  './js/logik/woche.js',
  './js/logik/plan.js',
  './js/logik/vorlieben.js',
  './js/ansichten/heute.js',
  './js/ansichten/eintrag.js',
  './js/ansichten/zutaten.js',
  './js/ansichten/rezepte.js',
  './js/ansichten/woche.js',
  './js/ansichten/einkauf.js',
  './js/ansichten/magliste.js',
  './js/ansichten/mehr.js',
];

self.addEventListener('install', (ereignis) => {
  // cache: 'reload' umgeht den HTTP-Cache des Browsers, damit wirklich die neuen Dateien im Cache landen.
  // addAll ist "alles oder nichts": fehlt eine Datei, schlägt die Installation fehl und der alte Stand bleibt aktiv.
  ereignis.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(DATEIEN.map((url) => new Request(url, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', (ereignis) => {
  // Alte Caches löschen (auch die der früheren App unter dieser Adresse), dann offene Seiten übernehmen
  ereignis.waitUntil(
    caches.keys()
      .then((namen) => Promise.all(namen.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (ereignis) => {
  const anfrage = ereignis.request;
  // Nur eigene GET-Anfragen bedienen. Alles Fremde (Open Food Facts) geht unverändert ins Netz.
  if (anfrage.method !== 'GET' || new URL(anfrage.url).origin !== self.location.origin) return;
  // Cache zuerst: die App startet ohne Netz und immer mit zueinander passenden Dateien einer Version.
  ereignis.respondWith(caches.match(anfrage, { ignoreSearch: true }).then((treffer) => treffer ?? fetch(anfrage)));
});
