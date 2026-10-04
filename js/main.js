import { starteRouter, aktuelleRoute } from './router.js';
import { mehr } from './views/mehr.js';
import { heute } from './views/heute.js';
import { einstellungen } from './views/einstellungen.js';
import { lebensmittel } from './views/lebensmittel.js';
import { backup } from './views/backup.js';
import { einrichtung } from './views/einrichtung.js';
import { gewicht } from './views/gewicht.js';
import { training } from './views/training.js';
import { lager } from './views/lager.js';
import { fortschritt } from './views/fortschritt.js';
import { held } from './views/held.js';
import { erfolge } from './views/erfolge.js';
import { koerper } from './views/koerper.js';
import { freunde } from './views/freunde.js';
import { tagebuch } from './views/tagebuch.js';
import { rezepte } from './views/rezepte.js';
import { mealprep } from './views/mealprep.js';
import { woche } from './views/woche.js';
import { einkauf } from './views/einkauf.js';
import { vorlieben } from './views/vorlieben.js';
import { angebote } from './views/angebote.js';
import { ausbau } from './views/ausbau.js';
import { masse } from './views/masse.js';
import { aktion } from './views/aktion.js';
import { geschichte } from './views/geschichte.js';
import { rueckblick } from './views/rueckblick.js';
import { zeigeTour, tourGesehen } from './views/tour.js';
import { pruefeSpaeter } from './spiel.js';
import { oeffnePanel, schnellEinstellungen } from './views/panel.js';
import { pruefeEinrichtung, istEingerichtet, beiTagGespeichert } from './state.js';
import { wendeDarstellungAn } from './darstellung.js';
import { icon } from './icons.js';

wendeDarstellungAn();
document.querySelectorAll('.nav-icon[data-icon]').forEach((platz) => platz.append(icon(platz.dataset.icon, 22)));

const ansichten = {
  mehr, heute, einstellungen, lebensmittel, backup, einrichtung, gewicht, training, lager, fortschritt, held, erfolge, koerper, freunde, tagebuch, rezepte, mealprep, woche, einkauf, vorlieben, angebote, ausbau, masse, aktion, geschichte, rueckblick };

// Ohne Profil nur Einrichtung und Backup (zum Wiederherstellen) erlauben
const wache = (name) => (istEingerichtet() || name === 'backup' ? null : 'einrichtung');

let neuZeichnen = () => {};
pruefeEinrichtung().then(() => {
  neuZeichnen = starteRouter(ansichten, 'lager', document.getElementById('inhalt'), wache);
  // Erfolge prüfen: beim Start und nach jeder gespeicherten Änderung (Brom verkündet Neues)
  if (istEingerichtet()) pruefeSpaeter(2500);
  // Einführung einmal nach der Einrichtung zeigen
  if (istEingerichtet() && !tourGesehen()) setTimeout(zeigeTour, 1200);
  beiTagGespeichert(() => pruefeSpaeter());
});

// Zahnrad: immer oben rechts, öffnet die Einstellungen der aktuellen Seite plus Darstellung
const zahnrad = document.getElementById('zahnrad');
zahnrad.append(icon('zahnrad', 22));
zahnrad.addEventListener('click', () => {
  const ansicht = ansichten[aktuelleRoute()];
  const eigene = ansicht?.einstellungen?.();
  oeffnePanel(eigene ? `Einstellungen: ${ansicht.titel}` : 'Einstellungen', [eigene, schnellEinstellungen()], () => {
    const y = window.scrollY;
    neuZeichnen();
    window.scrollTo(0, y);
  });
});

// Offline-Hinweis im Kopf
const offlineHinweis = document.getElementById('offline-hinweis');
const aktualisiereOnline = () => { offlineHinweis.hidden = navigator.onLine; };
window.addEventListener('online', aktualisiereOnline);
window.addEventListener('offline', aktualisiereOnline);
aktualisiereOnline();

// Service Worker für Offline-Betrieb (nur über HTTPS oder localhost)
if ('serviceWorker' in navigator) {
  const hatteVersion = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    // Beim Zurückkehren in die App nach Updates sehen (installierte PWAs laufen oft tagelang)
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch((fehler) => {
    console.error('Service Worker konnte nicht registriert werden:', fehler);
  });
  // Neue Version aktiv → Hinweis zum Neuladen (nicht beim allerersten Start)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hatteVersion || document.querySelector('.update-hinweis')) return;
    const hinweis = document.createElement('div');
    hinweis.className = 'update-hinweis';
    hinweis.setAttribute('role', 'status');
    const knopf = document.createElement('button');
    knopf.className = 'knopf';
    knopf.type = 'button';
    knopf.textContent = 'Neu laden';
    knopf.addEventListener('click', () => location.reload());
    const text = document.createElement('span');
    text.textContent = document.documentElement.dataset.stil === 'schlicht' ? 'Neue Version verfügbar.' : 'Die Schmiede hat Neues gefertigt.';
    hinweis.append(text, knopf);
    document.body.append(hinweis);
  });
}

// Browser bitten, die lokalen Daten nicht automatisch zu löschen
if (navigator.storage?.persist) {
  navigator.storage.persisted().then((schonDauerhaft) => {
    if (!schonDauerhaft) navigator.storage.persist();
  });
}
