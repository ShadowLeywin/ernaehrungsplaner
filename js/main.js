import { starteRouter, aktuelleRoute } from './router.js';
import { ansichten as platzhalter } from './views/platzhalter.js';
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
import { pruefeSpaeter } from './spiel.js';
import { oeffnePanel, schnellEinstellungen } from './views/panel.js';
import { pruefeEinrichtung, istEingerichtet, beiTagGespeichert } from './state.js';
import { wendeDarstellungAn } from './darstellung.js';
import { icon } from './icons.js';

wendeDarstellungAn();
document.querySelectorAll('.nav-icon[data-icon]').forEach((platz) => platz.append(icon(platz.dataset.icon, 22)));

const ansichten = { ...platzhalter, heute, einstellungen, lebensmittel, backup, einrichtung, gewicht, training, lager, fortschritt, held, erfolge };

// Ohne Profil nur Einrichtung und Backup (zum Wiederherstellen) erlauben
const wache = (name) => (istEingerichtet() || name === 'backup' ? null : 'einrichtung');

let neuZeichnen = () => {};
pruefeEinrichtung().then(() => {
  neuZeichnen = starteRouter(ansichten, 'lager', document.getElementById('inhalt'), wache);
  // Erfolge prüfen: beim Start und nach jeder gespeicherten Änderung (Brom verkündet Neues)
  if (istEingerichtet()) pruefeSpaeter(2500);
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
  navigator.serviceWorker.register('./sw.js').catch((fehler) => {
    console.error('Service Worker konnte nicht registriert werden:', fehler);
  });
}

// Browser bitten, die lokalen Daten nicht automatisch zu löschen
if (navigator.storage?.persist) {
  navigator.storage.persisted().then((schonDauerhaft) => {
    if (!schonDauerhaft) navigator.storage.persist();
  });
}
