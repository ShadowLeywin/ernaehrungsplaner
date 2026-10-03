// Kleiner Wrapper um IndexedDB. Alle Nutzerdaten bleiben lokal auf dem Gerät.
// Neue Speicherbereiche: in STORES eintragen und DB_VERSION erhöhen.

const DB_NAME = 'ernaehrungsplaner';
const DB_VERSION = 2;
// einstellungen: Profil · tage: Tagesdaten je Datum ("2026-10-05")
const STORES = ['einstellungen', 'tage'];

let dbVersprechen;

function oeffne() {
  dbVersprechen ??= new Promise((aufloesen, ablehnen) => {
    const anfrage = indexedDB.open(DB_NAME, DB_VERSION);
    anfrage.onupgradeneeded = () => {
      const db = anfrage.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
      }
    };
    anfrage.onsuccess = () => aufloesen(anfrage.result);
    anfrage.onerror = () => ablehnen(anfrage.error);
  });
  return dbVersprechen;
}

async function ausfuehren(store, modus, aktion) {
  const db = await oeffne();
  return new Promise((aufloesen, ablehnen) => {
    const tx = db.transaction(store, modus);
    const anfrage = aktion(tx.objectStore(store));
    tx.oncomplete = () => aufloesen(anfrage.result);
    tx.onerror = () => ablehnen(tx.error);
    tx.onabort = () => ablehnen(tx.error);
  });
}

export const lese = (store, schluessel) => ausfuehren(store, 'readonly', (s) => s.get(schluessel));
export const schreibe = (store, schluessel, wert) => ausfuehren(store, 'readwrite', (s) => s.put(wert, schluessel));
export const anzahl = (store) => ausfuehren(store, 'readonly', (s) => s.count());

/** Alle Einträge eines Speichers als [[schluessel, wert], …] */
export async function alleEintraege(store) {
  const db = await oeffne();
  return new Promise((aufloesen, ablehnen) => {
    const ergebnis = [];
    const tx = db.transaction(store, 'readonly');
    tx.objectStore(store).openCursor().onsuccess = (e) => {
      const cursor = e.target.result;
      if (!cursor) return;
      ergebnis.push([cursor.key, cursor.value]);
      cursor.continue();
    };
    tx.oncomplete = () => aufloesen(ergebnis);
    tx.onerror = () => ablehnen(tx.error);
  });
}

/** Speicher komplett ersetzen – alles in einer Transaktion: entweder alles oder nichts. */
export async function ersetzeAlles(datenProStore) {
  const db = await oeffne();
  const stores = Object.keys(datenProStore);
  return new Promise((aufloesen, ablehnen) => {
    const tx = db.transaction(stores, 'readwrite');
    for (const store of stores) {
      const s = tx.objectStore(store);
      s.clear();
      for (const [schluessel, wert] of datenProStore[store]) s.put(wert, schluessel);
    }
    tx.oncomplete = () => aufloesen();
    tx.onerror = () => ablehnen(tx.error);
    tx.onabort = () => ablehnen(tx.error);
  });
}
