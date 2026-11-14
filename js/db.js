// Dünne Schicht über IndexedDB. Alle Nutzerdaten bleiben auf dem Gerät.
// Die Ansichten rufen diese Datei nie direkt auf, sondern js/speicher.js.

import { APP_KENNUNG, SCHEMA_VERSION, STORES } from './logik/schema.js';

/**
 * Eine Migration je Schema-Version, in Reihenfolge. MIGRATIONEN[0] baut Version 1 aus dem Nichts,
 * MIGRATIONEN[1] hebt Version 1 auf 2 und so weiter. Bestehende Einträge nie ändern, nur anhängen.
 * Jede Funktion bekommt die Datenbank und die laufende Upgrade-Transaktion.
 */
export const MIGRATIONEN = [
  (db) => {
    db.createObjectStore('zutaten', { keyPath: 'id' });
    const eintraege = db.createObjectStore('eintraege', { keyPath: 'id' });
    eintraege.createIndex('datum', 'datum');
    db.createObjectStore('tage', { keyPath: 'datum' });
    db.createObjectStore('einstellungen', { keyPath: 'schluessel' });
  },
  // Version 2: Rezepte
  (db) => {
    db.createObjectStore('rezepte', { keyPath: 'id' });
  },
  // Version 3: Wochenplan und Einkaufsliste
  (db) => {
    db.createObjectStore('plan', { keyPath: 'id' }).createIndex('datum', 'datum');
    db.createObjectStore('einkauf', { keyPath: 'id' }).createIndex('woche', 'woche');
  },
  // Version 4: Mag-Liste
  (db) => {
    db.createObjectStore('vorlieben', { keyPath: 'zutatId' });
  },
];

let offen;

function oeffne() {
  offen ??= new Promise((aufloesen, ablehnen) => {
    const anfrage = indexedDB.open(APP_KENNUNG, SCHEMA_VERSION);
    anfrage.onupgradeneeded = (ereignis) => {
      // oldVersion ist 0 bei einer frischen Installation; es laufen nur die fehlenden Schritte
      for (let v = ereignis.oldVersion; v < SCHEMA_VERSION; v += 1) MIGRATIONEN[v](anfrage.result, anfrage.transaction);
    };
    anfrage.onsuccess = () => {
      const db = anfrage.result;
      // Ein zweiter Tab mit neuerer App-Version will upgraden: Verbindung freigeben statt blockieren
      db.onversionchange = () => { db.close(); offen = undefined; };
      aufloesen(db);
    };
    anfrage.onerror = () => { offen = undefined; ablehnen(anfrage.error); };
    anfrage.onblocked = () => ablehnen(new Error('Die Datenbank ist in einem anderen Tab geöffnet. Schließe ihn und lade neu.'));
  });
  return offen;
}

/** Eine Transaktion ausführen; das Ergebnis steht erst fest, wenn sie abgeschlossen ist. */
async function tx(stores, modus, arbeit) {
  const db = await oeffne();
  return new Promise((aufloesen, ablehnen) => {
    const t = db.transaction(stores, modus);
    let ergebnis;
    t.oncomplete = () => aufloesen(ergebnis);
    t.onerror = () => ablehnen(t.error);
    t.onabort = () => ablehnen(t.error ?? new Error('Speichern abgebrochen.'));
    ergebnis = arbeit(t);
    // Schlägt eine einzelne Anfrage fehl, meldet das schon t.onerror; hier nur doppelte Meldungen vermeiden
    if (ergebnis instanceof Promise) ergebnis.catch(() => {});
  });
}

const warte = (anfrage) => new Promise((ok, nein) => {
  anfrage.onsuccess = () => ok(anfrage.result);
  anfrage.onerror = () => nein(anfrage.error);
});

export const alle = (store) => tx(store, 'readonly', (t) => warte(t.objectStore(store).getAll()));
export const hole = (store, schluessel) => tx(store, 'readonly', (t) => warte(t.objectStore(store).get(schluessel)));
export const nachIndex = (store, index, wert) => tx(store, 'readonly', (t) => warte(t.objectStore(store).index(index).getAll(wert)));
/** Alle Sätze, deren Indexwert zwischen von und bis liegt (beide eingeschlossen). */
export const imBereich = (store, index, von, bis) => tx(store, 'readonly', (t) => warte(t.objectStore(store).index(index).getAll(IDBKeyRange.bound(von, bis))));
export const speichere = (store, satz) => tx(store, 'readwrite', (t) => { t.objectStore(store).put(satz); return satz; });
export const loesche = (store, schluessel) => tx(store, 'readwrite', (t) => { t.objectStore(store).delete(schluessel); });

/** Alle Speicher auslesen: { store: [sätze] } */
export async function allesLesen() {
  const namen = Object.keys(STORES);
  const listen = await tx(namen, 'readonly', (t) => Promise.all(namen.map((n) => warte(t.objectStore(n).getAll()))));
  return Object.fromEntries(namen.map((n, i) => [n, listen[i]]));
}

/**
 * Alle Speicher in EINER Transaktion ersetzen (Backup einspielen).
 * Geht dabei etwas schief, bricht die Transaktion ab und der alte Stand bleibt vollständig erhalten.
 */
export function allesErsetzen(daten) {
  const namen = Object.keys(STORES);
  return tx(namen, 'readwrite', (t) => {
    for (const name of namen) {
      const store = t.objectStore(name);
      store.clear();
      for (const satz of daten[name] ?? []) store.put(satz);
    }
  });
}
