// Einstieg: Ansichten anmelden, Router starten, Service Worker registrieren.

import './darstellung.js';
import { zeigeHeute } from './ansichten/heute.js';
import { zeigeMehr } from './ansichten/mehr.js';
import { zeigeRezepte } from './ansichten/rezepte.js';
import { zeigeZutaten } from './ansichten/zutaten.js';
import { route, starte } from './router.js';
import { hinweis } from './ui.js';

route('heute', zeigeHeute);
route('rezepte', zeigeRezepte);
route('zutaten', zeigeZutaten);
route('mehr', zeigeMehr);
starte(document.getElementById('inhalt'), 'heute');

/* ---------- Offline-Anzeige ---------- */

const offline = document.getElementById('offline');
const zeigeNetz = () => { offline.hidden = navigator.onLine; };
window.addEventListener('online', zeigeNetz);
window.addEventListener('offline', zeigeNetz);
zeigeNetz();

/* ---------- Service Worker ---------- */

// Beim lokalen Entwickeln stört der Cache (alte Dateien). Dort nur mit ?sw in der Adresse.
const lokal = ['localhost', '127.0.0.1'].includes(location.hostname);
if ('serviceWorker' in navigator && (!lokal || new URLSearchParams(location.search).has('sw'))) {
  const hatteSchon = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.register('./sw.js').catch((fehler) => console.error('Service Worker:', fehler));
  // Ein neuer Service Worker hat übernommen: die offene Seite läuft noch mit den alten Dateien
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hatteSchon) hinweis('Neue Version geladen.', { aktion: 'Neu starten', beiAktion: () => location.reload() });
  });
}
