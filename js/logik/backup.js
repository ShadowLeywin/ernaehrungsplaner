// Backup: alle Nutzerdaten als eine JSON-Datei. Reine Funktionen (Bauen und Prüfen).
// Browser-Speicher kann gelöscht werden; das Backup ist der einzige Schutz davor.

import { tageZwischen } from './datum.js';
import { APP_KENNUNG, SCHEMA_VERSION, STORES } from './schema.js';

/**
 * Umbauten für Backups aus älteren Schema-Versionen: BACKUP_MIGRATIONEN[1] hebt ein
 * Backup von Version 1 auf Version 2 und so weiter.
 */
export const BACKUP_MIGRATIONEN = {
  // Version 1 kannte noch keine Rezepte
  1: (daten) => ({ ...daten, rezepte: [] }),
  // Version 2 kannte noch keinen Wochenplan
  2: (daten) => ({ ...daten, plan: [], einkauf: [] }),
  // Version 3 kannte noch keine Mag-Liste
  3: (daten) => ({ ...daten, vorlieben: [] }),
  // Version 4 kannte noch keine Health-Werte
  4: (daten) => ({ ...daten, messungen: [], supplements: [] }),
  // Version 5 kannte noch keine Laborwerte und Symptome
  5: (daten) => ({ ...daten, labor: [], symptome: [] }),
  // Version 6 kannte noch keine Angebote
  6: (daten) => ({ ...daten, angebote: [] }),
};

export function erstelleBackup(daten, jetzt = new Date()) {
  const inhalt = {};
  for (const store of Object.keys(STORES)) inhalt[store] = daten[store] ?? [];
  return { app: APP_KENNUNG, schemaVersion: SCHEMA_VERSION, erstelltAm: jetzt.toISOString(), daten: inhalt };
}

export function backupDateiname(jetzt = new Date()) {
  const zwei = (n) => String(n).padStart(2, '0');
  return `${APP_KENNUNG}-backup-${jetzt.getFullYear()}-${zwei(jetzt.getMonth() + 1)}-${zwei(jetzt.getDate())}.json`;
}

/**
 * Eine eingelesene Datei prüfen, bevor irgendetwas überschrieben wird.
 * Liefert { ok, fehler: [text], daten, anzahl: { store: n }, erstelltAm }.
 */
export function pruefeBackup(roh) {
  const fehler = [];
  if (!roh || typeof roh !== 'object' || Array.isArray(roh)) return { ok: false, fehler: ['Die Datei enthält kein Backup.'] };
  if (roh.app !== APP_KENNUNG) fehler.push('Die Datei stammt nicht aus dieser App.');
  const version = roh.schemaVersion;
  if (!Number.isInteger(version) || version < 1) fehler.push('Die Schema-Version fehlt.');
  else if (version > SCHEMA_VERSION) fehler.push('Das Backup stammt aus einer neueren App-Version. Aktualisiere die App und versuche es erneut.');
  if (!roh.daten || typeof roh.daten !== 'object') fehler.push('Der Datenteil fehlt.');
  if (fehler.length) return { ok: false, fehler };

  let daten = roh.daten;
  for (let v = version; v < SCHEMA_VERSION; v += 1) daten = BACKUP_MIGRATIONEN[v](daten);

  const sauber = {};
  const anzahl = {};
  for (const [store, schluessel] of Object.entries(STORES)) {
    const liste = daten[store] ?? [];
    if (!Array.isArray(liste)) {
      fehler.push(`Der Bereich „${store}“ ist beschädigt.`);
      continue;
    }
    const ohneSchluessel = liste.filter((satz) => !satz || typeof satz !== 'object' || satz[schluessel] === undefined || satz[schluessel] === '');
    if (ohneSchluessel.length) fehler.push(`Im Bereich „${store}“ fehlt bei ${ohneSchluessel.length} Einträgen das Feld „${schluessel}“.`);
    sauber[store] = liste;
    anzahl[store] = liste.length;
  }
  if (fehler.length) return { ok: false, fehler };
  return { ok: true, fehler: [], daten: sauber, anzahl, erstelltAm: roh.erstelltAm ?? null };
}

export const BACKUP_AB_EINTRAEGEN = 5;
export const BACKUP_NACH_TAGEN = 14;

/**
 * Soll an ein Backup erinnert werden? Erst wenn es etwas zu verlieren gibt (ab 5 Einträgen im Tagebuch),
 * und dann, wenn noch nie gesichert wurde oder das letzte Backup älter als 14 Tage ist.
 * Liefert { faellig, tage } – tage ist null, wenn es noch kein Backup gab.
 */
export function backupFaellig(letztesBackup, heute, anzahlEintraege) {
  if (anzahlEintraege < BACKUP_AB_EINTRAEGEN) return { faellig: false, tage: null };
  if (!letztesBackup) return { faellig: true, tage: null };
  const tage = tageZwischen(letztesBackup, heute);
  return { faellig: tage > BACKUP_NACH_TAGEN, tage };
}
