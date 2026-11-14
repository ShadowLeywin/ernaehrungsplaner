// Einstieg: Ansichten anmelden, Router starten, Service Worker registrieren.

import './darstellung.js';
import { zeigeAngebote } from './ansichten/angebote.js';
import { zeigeHealth } from './ansichten/health.js';
import { zeigeHeute } from './ansichten/heute.js';
import { zeigeMehr } from './ansichten/mehr.js';
import { zeigeRezepte } from './ansichten/rezepte.js';
import { zeigeWoche } from './ansichten/woche.js';
import { zeigeZutaten } from './ansichten/zutaten.js';
import { route, starte } from './router.js';
import { hinweis } from './ui.js';

// Android "Teilen": Die App wird mit ?titel=…&text=…&url=… geöffnet (siehe share_target im Manifest).
// Den Inhalt merken, die Adresse aufräumen und zum Import springen.
const geteilt = new URLSearchParams(location.search);
if (geteilt.has('text') || geteilt.has('titel') || geteilt.has('url')) {
  const inhalt = [geteilt.get('titel'), geteilt.get('text'), geteilt.get('url')].filter(Boolean).join('\n');
  try { sessionStorage.setItem('elan.geteilt', inhalt); } catch { /* dann bleibt das Importfeld leer */ }
  history.replaceState(null, '', `${location.pathname}#/rezepte/import`);
}

route('heute', zeigeHeute);
route('woche', zeigeWoche);
route('angebote', zeigeAngebote);
route('rezepte', zeigeRezepte);
route('zutaten', zeigeZutaten);
route('health', zeigeHealth);
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
