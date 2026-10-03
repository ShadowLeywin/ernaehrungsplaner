import { starteRouter } from './router.js';
import { ansichten as platzhalter } from './views/platzhalter.js';
import { heute } from './views/heute.js';
import { einstellungen } from './views/einstellungen.js';
import { lebensmittel } from './views/lebensmittel.js';
import { backup } from './views/backup.js';
import { einrichtung } from './views/einrichtung.js';
import { pruefeEinrichtung, istEingerichtet } from './state.js';

const ansichten = { ...platzhalter, heute, einstellungen, lebensmittel, backup, einrichtung };

// Ohne Profil nur Einrichtung und Backup (zum Wiederherstellen) erlauben
const wache = (name) => (istEingerichtet() || name === 'backup' ? null : 'einrichtung');

pruefeEinrichtung().then(() => {
  starteRouter(ansichten, 'heute', document.getElementById('inhalt'), wache);
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
