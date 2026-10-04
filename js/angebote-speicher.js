// Angebote lokal speichern: Import per Datei oder Abruf einer gehosteten Datei (URL frei wählbar).
// Gespeichert in einstellungen: angebote (geprüfte Daten), angeboteEinstellungen { aktiv: [marktIds]|null, url, nurEssbar }
import { lese, schreibe } from './db.js';
import { pruefeAngebote, aktuelleAngebote } from './logic/angebote.js';
import { datumSchluessel } from './logic/ziele.js';

export async function holeAngebotsDaten() {
  const [daten, einstellungen] = await Promise.all([lese('einstellungen', 'angebote'), lese('einstellungen', 'angeboteEinstellungen')]);
  return { daten: daten ?? null, einstellungen: { aktiv: null, url: '', nurEssbar: true, ...einstellungen } };
}

export const speichereAngebotsEinstellungen = (e) => schreibe('einstellungen', 'angeboteEinstellungen', e);

/** Text einer angebote.json prüfen und speichern. Liefert { daten } oder { fehler }. */
export async function importiereAngebote(text) {
  const ergebnis = pruefeAngebote(text);
  if (ergebnis.daten) await schreibe('einstellungen', 'angebote', { ...ergebnis.daten, importiertAm: new Date().toISOString() });
  return ergebnis;
}

/** Gehostete Datei abrufen (nur Angebote, es werden keine Nutzerdaten gesendet). */
export async function ladeAngeboteVonUrl(url) {
  if (!/^https:\/\//.test(url)) return { fehler: 'Bitte eine https-Adresse angeben.' };
  try {
    const antwort = await fetch(url, { cache: 'no-store', credentials: 'omit' });
    if (!antwort.ok) return { fehler: `Abruf fehlgeschlagen (${antwort.status}).` };
    return importiereAngebote(await antwort.text());
  } catch {
    return { fehler: 'Abruf nicht möglich – offline oder Adresse falsch?' };
  }
}

/** Aktuell gültige Angebote mit den gespeicherten Einstellungen. */
export async function holeAktuelleAngebote() {
  const { daten, einstellungen } = await holeAngebotsDaten();
  return aktuelleAngebote(daten, {
    heute: datumSchluessel(new Date()),
    aktiv: einstellungen.aktiv ? new Set(einstellungen.aktiv) : null,
    nurEssbar: einstellungen.nurEssbar,
  });
}
