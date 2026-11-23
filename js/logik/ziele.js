// Tagestypen, Mahlzeiten-Slots und Ziele. Alle Zahlen hier sind neutrale Startwerte,
// die jeder Nutzer in den Einstellungen ändert. Persönliche Werte stehen nie im Code.

import { wochentagIndex } from './datum.js';

export const STANDARD_TAGESTYPEN = [
  { id: 'gym', name: 'Gym' },
  { id: 'calisthenics', name: 'Calisthenics' },
  { id: 'rest', name: 'Rest' },
];

/**
 * Die Tagestypen des Nutzers (Léons Wunsch vom 23.11.2026: Namen und Anzahl frei, schon bei der Ersteinrichtung).
 * Absichtlich eine veränderliche Bindung: Beim Start und nach jeder Änderung setzt die App die Liste aus der
 * Einstellung „tagestypen“ (setzeTagestypen); alle Module sehen dann sofort die eigenen Namen.
 * Kennungen bleiben beim Umbenennen gleich, damit Ziele, Wochenplan und alte Tage ihre Zuordnung behalten.
 */
export let TAGESTYPEN = STANDARD_TAGESTYPEN.map((t) => ({ ...t }));
export const MAX_TAGESTYPEN = 5;
export const MAX_TYPNAME = 16;

/** Gespeicherte Liste prüfen: 1 bis 5 Einträge, Kennung aus Kleinbuchstaben, Ziffern, Bindestrich, Name 1 bis 16 Zeichen, keine Doppelten */
export function bereinigeTagestypen(roh) {
  if (!Array.isArray(roh)) return STANDARD_TAGESTYPEN.map((t) => ({ ...t }));
  const ids = new Set();
  const namen = new Set();
  const liste = [];
  for (const t of roh) {
    const id = String(t?.id ?? '');
    const name = String(t?.name ?? '').trim().slice(0, MAX_TYPNAME);
    if (!/^[a-z0-9-]{1,24}$/.test(id) || !name || ids.has(id) || namen.has(name.toLowerCase())) continue;
    ids.add(id);
    namen.add(name.toLowerCase());
    liste.push({ id, name });
    if (liste.length === MAX_TAGESTYPEN) break;
  }
  return liste.length ? liste : STANDARD_TAGESTYPEN.map((t) => ({ ...t }));
}

export function setzeTagestypen(roh) {
  TAGESTYPEN = bereinigeTagestypen(roh);
  return TAGESTYPEN;
}

/** Eingabe aus Ersteinrichtung oder Einstellungen prüfen: [{ id, name }]. Liefert { ok, fehler, typen } */
export function pruefeTagestypen(eingabe) {
  const typen = (eingabe ?? []).map((t) => ({ id: t.id, name: String(t.name ?? '').trim() }));
  if (!typen.length) return { ok: false, fehler: 'Mindestens ein Tagestyp.' };
  if (typen.length > MAX_TAGESTYPEN) return { ok: false, fehler: `Höchstens ${MAX_TAGESTYPEN} Tagestypen.` };
  if (typen.some((t) => !t.name)) return { ok: false, fehler: 'Jeder Tagestyp braucht einen Namen.' };
  if (typen.some((t) => t.name.length > MAX_TYPNAME)) return { ok: false, fehler: `Namen höchstens ${MAX_TYPNAME} Zeichen.` };
  const klein = typen.map((t) => t.name.toLowerCase());
  if (new Set(klein).size !== klein.length) return { ok: false, fehler: 'Zwei Tagestypen heißen gleich.' };
  return { ok: true, fehler: null, typen };
}

/** Kennung für einen neuen Tagestyp, die es noch nicht gibt */
export function neueTypKennung(typen, zufall = Math.random) {
  let id;
  do { id = `typ-${Math.floor(zufall() * 1e6).toString(36)}`; } while (typen.some((t) => t.id === id));
  return id;
}

/** Farbe eines Tagestyps nach seiner Stelle in der Liste (CSS-Klassen tagestyp-farbe-0 bis -4) */
export const tagestypKlasse = (id) => `tagestyp-farbe-${Math.max(0, TAGESTYPEN.findIndex((t) => t.id === id)) % MAX_TAGESTYPEN}`;

/** Sechs Slots. anteil = Anteil am Tagesziel (Summe 1), bestimmt die Größe des Segments in der Tagesscheibe. */
export const SLOTS = [
  { id: 'fruehstueck', name: 'Frühstück', anteil: 0.25 },
  { id: 'morgensnack', name: 'Morgensnack', anteil: 0.08 },
  { id: 'mittag', name: 'Mittagessen', anteil: 0.27 },
  { id: 'nachmittagssnack', name: 'Nachmittagssnack', anteil: 0.1, hinweis: 'auch Preworkout' },
  { id: 'abend', name: 'Abendessen', anteil: 0.25 },
  { id: 'abendsnack', name: 'Abendsnack', anteil: 0.05 },
];

export const ZIEL_FELDER = [
  { id: 'kcal', name: 'Energie', einheit: 'kcal', max: 10000 },
  { id: 'protein', name: 'Eiweiß', einheit: 'g', max: 1000 },
  { id: 'kh', name: 'Kohlenhydrate', einheit: 'g', max: 2000 },
  { id: 'fett', name: 'Fett', einheit: 'g', max: 1000 },
  { id: 'ballaststoffe', name: 'Ballaststoffe', einheit: 'g', max: 200 },
];

export const STANDARD_ZIELE = {
  gym: { kcal: 2700, protein: 150, kh: 345, fett: 80, ballaststoffe: 30 },
  calisthenics: { kcal: 2500, protein: 150, kh: 306, fett: 75, ballaststoffe: 30 },
  rest: { kcal: 2300, protein: 150, kh: 268, fett: 70, ballaststoffe: 30 },
};

/** Montag bis Sonntag */
export const STANDARD_WOCHE = ['gym', 'calisthenics', 'gym', 'calisthenics', 'gym', 'rest', 'rest'];

const istTagestyp = (id) => TAGESTYPEN.some((t) => t.id === id);

/**
 * Ein Ziel auf eine neue Energiemenge umrechnen: Eiweiß bleibt, Kohlenhydrate und Fett teilen sich
 * den Rest im bisherigen Verhältnis ihrer Energie. Ballaststoffe bleiben. Ergebnis auf ganze Gramm gerundet.
 */
export function skaliereZiel(ziel, kcal) {
  const ausEiweiss = 4 * ziel.protein;
  const rest = Math.max(0, kcal - ausEiweiss);
  const khKcal = 4 * ziel.kh;
  const fettKcal = 9 * ziel.fett;
  const anteilKh = khKcal + fettKcal > 0 ? khKcal / (khKcal + fettKcal) : 0.6;
  return {
    ...ziel,
    kcal,
    kh: Math.round((rest * anteilKh) / 4),
    fett: Math.round((rest * (1 - anteilKh)) / 9),
  };
}

/** Gespeicherte Ziele mit den Startwerten auffüllen; ungültige Zahlen fallen auf den Startwert zurück. */
export function bereinigeZiele(roh) {
  const ziele = {};
  for (const { id } of TAGESTYPEN) {
    ziele[id] = {};
    for (const feld of ZIEL_FELDER) {
      const wert = roh?.[id]?.[feld.id];
      const gueltig = typeof wert === 'number' && Number.isFinite(wert) && wert >= 0 && wert <= feld.max;
      // Ein eigener Tagestyp startet mit den mittleren Startwerten
      ziele[id][feld.id] = gueltig ? wert : (STANDARD_ZIELE[id] ?? STANDARD_ZIELE.calisthenics)[feld.id];
    }
  }
  return ziele;
}

export function bereinigeWoche(roh) {
  // Ein gelöschter Tagestyp fällt auf den Startwert zurück, und wenn es den auch nicht mehr gibt, auf den ersten Typ
  return STANDARD_WOCHE.map((standard, i) => {
    if (istTagestyp(roh?.[i])) return roh[i];
    return istTagestyp(standard) ? standard : TAGESTYPEN[0].id;
  });
}

/** Anteile der Slots in Prozent, so wie sie im Code stehen. */
export const STANDARD_ANTEILE = Object.fromEntries(SLOTS.map((s) => [s.id, Math.round(s.anteil * 100)]));

/** Gespeicherte Anteile prüfen; passt etwas nicht (fehlender Slot, Summe nicht 100), gelten die Startwerte. */
export function bereinigeAnteile(roh) {
  const werte = SLOTS.map((s) => roh?.[s.id]);
  const gueltig = werte.every((w) => typeof w === 'number' && Number.isFinite(w) && w >= 0 && w <= 100)
    && Math.abs(werte.reduce((a, b) => a + b, 0) - 100) < 0.01;
  return gueltig ? Object.fromEntries(SLOTS.map((s) => [s.id, roh[s.id]])) : { ...STANDARD_ANTEILE };
}

/** Slots mit den eingestellten Anteilen (als Bruchteil von 1) für Tagesscheibe und Slot-Ziele. */
export function slotsMitAnteilen(anteile) {
  const sauber = bereinigeAnteile(anteile);
  return SLOTS.map((s) => ({ ...s, anteil: sauber[s.id] / 100 }));
}

/** Eingabe aus den Einstellungen prüfen: { slotId: '25' }. Liefert { ok, fehler, summe, anteile }. */
export function pruefeAnteile(eingabe) {
  const anteile = {};
  for (const s of SLOTS) {
    const text = String(eingabe?.[s.id] ?? '').trim().replace(',', '.');
    const wert = /^\d+(\.\d+)?$/.test(text) ? Number(text) : NaN;
    if (Number.isNaN(wert) || wert > 100) return { ok: false, fehler: `${s.name}: eine Zahl von 0 bis 100.`, summe: null, anteile: null };
    anteile[s.id] = wert;
  }
  const summe = Object.values(anteile).reduce((a, b) => a + b, 0);
  if (Math.abs(summe - 100) >= 0.01) {
    const diff = Math.round((100 - summe) * 10) / 10;
    return { ok: false, fehler: `Zusammen ${Math.round(summe * 10) / 10} %. Es ${diff > 0 ? 'fehlen' : 'sind'} ${Math.abs(diff)} % ${diff > 0 ? '' : 'zu viel'}`.trim() + '.', summe, anteile: null };
  }
  return { ok: true, fehler: null, summe, anteile };
}

/** Tagestyp eines Datums: eine Angabe am Tag selbst schlägt den Wochenplan. */
export function tagestypFuer(datum, woche, tag) {
  if (istTagestyp(tag?.tagestyp)) return tag.tagestyp;
  return bereinigeWoche(woche)[wochentagIndex(datum)];
}

/** Stand gegen ein Ziel. anteil kann über 1 liegen. */
export function fortschritt(ist = 0, ziel = 0) {
  if (!(ziel > 0)) return { anteil: 0, rest: 0, ueber: false };
  return { anteil: ist / ziel, rest: ziel - ist, ueber: ist > ziel };
}

/** Kacheln auf „Heute“ in fester Reihenfolge. Jede lässt sich ausblenden (Mehr → Ziele). */
export const RINGE = [
  { id: 'protein', name: 'Eiweiß' },
  { id: 'kh', name: 'Kohlenhydrate' },
  { id: 'fett', name: 'Fett' },
  { id: 'ballaststoffe', name: 'Ballaststoffe' },
  { id: 'wasser', name: 'Wasser' },
  { id: 'alle', name: 'Alle Nährwerte' },
];

/** Gespeicherte Auswahl prüfen: nur bekannte Ringe, in fester Reihenfolge. Nichts Gültiges gespeichert: alle. */
export function bereinigeRinge(roh) {
  if (!Array.isArray(roh)) return RINGE.map((r) => r.id);
  return RINGE.map((r) => r.id).filter((id) => roh.includes(id));
}

/** Spalten für das Kachel-Raster: 4 Kacheln als 2 × 2 statt 3 + 1, sonst bis zu 3 nebeneinander. */
export const kachelSpalten = (anzahl) => (anzahl === 4 ? 2 : Math.max(1, Math.min(3, anzahl)));

/**
 * Ringe, deren Erreichen gefeiert wird. Kohlenhydrate und Fett nicht: Dort ist das Ziel eher eine Obergrenze,
 * es zu erreichen ist kein Erfolg an sich.
 */
export const FEIER_RINGE = ['protein', 'ballaststoffe', 'wasser'];

/** Wurde ein Ziel gerade erreicht? Nur beim Übergang unter 100 % → ab 100 %, nicht beim ersten Anzeigen. */
export function neuErreicht(vorher, jetzt) {
  return typeof vorher === 'number' && typeof jetzt === 'number' && vorher < 1 && jetzt >= 1;
}

/** Welcher Slot passt zur Uhrzeit? Vorbelegung beim Eintragen, der Nutzer kann ändern. */
export function slotFuerUhrzeit(stunde) {
  if (stunde < 10) return 'fruehstueck';
  if (stunde < 12) return 'morgensnack';
  if (stunde < 15) return 'mittag';
  if (stunde < 18) return 'nachmittagssnack';
  if (stunde < 21) return 'abend';
  return 'abendsnack';
}

/** kcal-Ziel je Slot aus dem Tagesziel */
export function slotZiele(kcal) {
  return Object.fromEntries(SLOTS.map((s) => [s.id, kcal * s.anteil]));
}

/**
 * Passen die Makros zum kcal-Ziel? Gerechnet wird mit 4/4/9 kcal je g, ohne Ballaststoffe.
 * Liefert die Abweichung in kcal (positiv = Makros ergeben mehr als das kcal-Ziel).
 */
export function makroAbweichung(ziel) {
  const ausMakros = 4 * ziel.protein + 4 * ziel.kh + 9 * ziel.fett;
  return { ausMakros, abweichung: ausMakros - ziel.kcal };
}
