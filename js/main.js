import { starteRouter } from './router.js';
import { ansichten } from './views/platzhalter.js';

starteRouter(ansichten, 'heute', document.getElementById('inhalt'));

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
