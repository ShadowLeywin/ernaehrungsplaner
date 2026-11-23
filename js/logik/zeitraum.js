// Zeiträume für Plan und Einkaufsliste: Woche, Monat oder frei gewählt. Reine Funktionen.
// Ein Zeitraum ist { art, von, bis } mit Tagen als "JJJJ-MM-TT"; von und bis gehören dazu.

import { ausIso, isoDatum, istGueltig, tageZwischen, verschiebe, wochentagIndex } from './datum.js';

/** Längster frei wählbarer Zeitraum: zwei Monate. Eine längere Liste kauft niemand auf einmal ein. */
export const MAX_TAGE = 62;

const MONAT = /^(\d{4})-(\d{2})$/;

export const istMonat = (text) => typeof text === 'string' && MONAT.test(text) && Number(text.slice(5)) >= 1 && Number(text.slice(5)) <= 12;

/** "2026-11-23" → "2026-11" */
export const monatVon = (datum) => datum.slice(0, 7);

/** Monat verschieben: verschiebeMonat("2026-12", 1) → "2027-01" */
export function verschiebeMonat(monat, schritte) {
  const [j, m] = monat.split('-').map(Number);
  const d = new Date(j, m - 1 + schritte, 1, 12);
  return isoDatum(d).slice(0, 7);
}

/** "Dezember 2026" */
export function monatsName(monat) {
  return new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(ausIso(`${monat}-01`));
}

/** Woche (Montag bis Sonntag), die das Datum enthält */
export function wocheUm(datum) {
  const von = verschiebe(datum, -wochentagIndex(datum));
  return { art: 'woche', von, bis: verschiebe(von, 6) };
}

/** Kalendermonat, der das Datum enthält */
export function monatUm(datum) {
  const von = `${monatVon(datum)}-01`;
  return { art: 'monat', von, bis: verschiebe(`${verschiebeMonat(monatVon(datum), 1)}-01`, -1) };
}

/**
 * Frei gewählten Zeitraum prüfen. Liefert { ok, fehler, zeitraum }.
 * Vertauschte Daten werden still getauscht: wer "bis" vor "von" wählt, meint denselben Zeitraum.
 */
export function freierZeitraum(von, bis) {
  if (!istGueltig(von) || !istGueltig(bis)) return { ok: false, fehler: 'Bitte zwei gültige Tage wählen.' };
  const [a, b] = von <= bis ? [von, bis] : [bis, von];
  const tage = tageZwischen(a, b) + 1;
  if (tage > MAX_TAGE) return { ok: false, fehler: `Höchstens ${MAX_TAGE} Tage auf einmal (gewählt: ${tage}).` };
  return { ok: true, fehler: '', zeitraum: { art: artVon(a, b), von: a, bis: b } };
}

/** Ist der Zeitraum genau eine Woche oder ein Monat? Dann zeigt die Seite den passenden Knopf als gewählt. */
export function artVon(von, bis) {
  const w = wocheUm(von);
  if (w.von === von && w.bis === bis) return 'woche';
  const m = monatUm(von);
  if (m.von === von && m.bis === bis) return 'monat';
  return 'frei';
}

/** Alle Tage von bis bis, beide eingeschlossen */
export function tageIm({ von, bis }) {
  const tage = [];
  for (let d = von; d <= bis; d = verschiebe(d, 1)) tage.push(d);
  return tage;
}

/** Schlüssel für Häkchen und eigene Posten der Einkaufsliste: "2026-11-23..2026-11-29" */
export const zeitraumSchluessel = ({ von, bis }) => `${von}..${bis}`;

/** Umkehrung von zeitraumSchluessel; null bei allem, was kein gültiger Schlüssel ist */
export function leseZeitraumSchluessel(text) {
  const [von, bis, rest] = String(text).split('..');
  if (rest !== undefined || !istGueltig(von) || !istGueltig(bis) || von > bis) return null;
  return { art: artVon(von, bis), von, bis };
}

/** Kalenderwoche nach ISO 8601: Woche 1 enthält den ersten Donnerstag des Jahres */
export function kalenderwoche(datum) {
  const donnerstag = ausIso(verschiebe(datum, 3 - wochentagIndex(datum)));
  const jahresanfang = new Date(donnerstag.getFullYear(), 0, 1, 12);
  return 1 + Math.floor(Math.round((donnerstag - jahresanfang) / 86400000) / 7);
}

/**
 * Wochen eines Monats für die Monatsansicht. Jede Woche läuft von Montag bis Sonntag,
 * auch wenn sie in den Vor- oder Folgemonat reicht; imMonat sagt, welche Tage dazugehören.
 * Liefert [{ kw, von, bis, tage: [{ datum, imMonat }] }], vier bis sechs Wochen.
 */
export function monatsWochen(monat) {
  const { von, bis } = monatUm(`${monat}-01`);
  const wochen = [];
  for (let montag = wocheUm(von).von; montag <= bis; montag = verschiebe(montag, 7)) {
    const tage = Array.from({ length: 7 }, (_, i) => verschiebe(montag, i));
    wochen.push({ kw: kalenderwoche(montag), von: montag, bis: tage[6], tage: tage.map((datum) => ({ datum, imMonat: monatVon(datum) === monat })) });
  }
  return wochen;
}

/**
 * Häkchen und eigene Posten der Einkaufsliste bis Schema 7 hingen an einer Woche (Feld woche, Kennung "<montag>|<zutatId>").
 * Ab Schema 8 hängen sie an einem Zeitraum. Eine alte Woche wird zum Zeitraum Montag bis Sonntag;
 * Häkchen bekommen die neue Kennung, eigene Posten behalten ihre.
 */
export function migriereEinkaufSatz(satz) {
  if (!satz || satz.zeitraum || !istGueltig(satz.woche)) return satz;
  const { woche, ...rest } = satz;
  const zeitraum = zeitraumSchluessel({ von: woche, bis: verschiebe(woche, 6) });
  return { ...rest, zeitraum, id: rest.schluessel ? `${zeitraum}|${rest.schluessel}` : rest.id };
}
