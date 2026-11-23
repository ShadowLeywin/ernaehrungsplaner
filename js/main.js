// Einstieg: Ansichten anmelden, Router starten, Service Worker registrieren.

import './darstellung.js';
import { zeigeAngebote } from './ansichten/angebote.js';
import { zeigeFortschritt } from './ansichten/health.js';
import { zeigeHeute } from './ansichten/heute.js';
import { zeigeMehr } from './ansichten/mehr.js';
import { zeigeRezepte } from './ansichten/rezepte.js';
import { istEingerichtet, merkeEingerichtet, zeigeWillkommen } from './ansichten/willkommen.js';
import { zeigeWoche } from './ansichten/woche.js';
import { zeigeEinkauf } from './ansichten/einkauf.js';
import { zeigeMaerkte } from './ansichten/maerkte.js';
import * as speicher from './speicher.js';
import { zeigeZutaten } from './ansichten/zutaten.js';
import { neuZeichnen, route, starte } from './router.js';
import { automatischAn, gleicheAb } from './abgleich.js';
import { istApp } from './plattform.js';
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
route('einkauf', zeigeEinkauf);
route('maerkte', zeigeMaerkte);
route('rezepte', zeigeRezepte);
route('zutaten', zeigeZutaten);
route('fortschritt', zeigeFortschritt);
// Alte Adressen (#/health, #/health/labor …) aus Lesezeichen und älteren Fassungen führen weiter
route('health', (wurzel, teile) => {
  history.replaceState(null, '', `${location.pathname}${location.search}#/fortschritt${teile.length ? `/${teile.join('/')}` : ''}`);
  return zeigeFortschritt(wurzel, teile);
});
route('mehr', zeigeMehr);
route('willkommen', zeigeWillkommen);

// Erster Start: kurze Einrichtung. Wer schon Einträge hat (zum Beispiel nach einem Update), sieht sie nicht.
const startseite = ['', '#', '#/', '#/heute'].includes(location.hash);
if (!istEingerichtet() && startseite) {
  if ((await speicher.anzahlEintraege().catch(() => 0)) > 0) merkeEingerichtet();
  else history.replaceState(null, '', `${location.pathname}${location.search}#/willkommen`);
}
starte(document.getElementById('inhalt'), 'heute');

/* ---------- Health Connect: beim Öffnen abgleichen, wenn eingeschaltet ---------- */

// Höchstens alle 15 Minuten; auch wenn die App aus dem Hintergrund zurückkommt. Fehler stören nie den Start.
let letzterAbgleich = 0;
const abgleich = async () => {
  if (!istApp() || !automatischAn() || Date.now() - letzterAbgleich < 15 * 60 * 1000) return;
  letzterAbgleich = Date.now();
  try { if (await gleicheAb() > 0) neuZeichnen(); } catch (fehler) { console.warn('Health Connect:', fehler); }
};
abgleich();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') abgleich(); });

/* ---------- Unerwartete Fehler ---------- */

// Was nirgends abgefangen wird, soll trotzdem sichtbar werden, statt dass ein Knopf „nichts tut“.
// Höchstens ein Hinweis alle 3 Sekunden, damit eine Fehlerschleife die Seite nicht zuschüttet.
let letzterFehler = 0;
const zeigeFehler = (fehler) => {
  console.error(fehler);
  if (Date.now() - letzterFehler < 3000) return;
  letzterFehler = Date.now();
  hinweis('Etwas ist schiefgelaufen. Deine Daten sind sicher; lade die Seite neu, falls etwas hängt.', { aktion: 'Neu laden', beiAktion: () => location.reload() });
};
window.addEventListener('unhandledrejection', (e) => zeigeFehler(e.reason));
window.addEventListener('error', (e) => { if (e.error) zeigeFehler(e.error); });

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
