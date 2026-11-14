// Tagestypen, Mahlzeiten-Slots und Ziele. Alle Zahlen hier sind neutrale Startwerte,
// die jeder Nutzer in den Einstellungen ändert. Persönliche Werte stehen nie im Code.

import { wochentagIndex } from './datum.js';

export const TAGESTYPEN = [
  { id: 'gym', name: 'Gym' },
  { id: 'calisthenics', name: 'Calisthenics' },
  { id: 'rest', name: 'Rest' },
];

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

/** Gespeicherte Ziele mit den Startwerten auffüllen; ungültige Zahlen fallen auf den Startwert zurück. */
export function bereinigeZiele(roh) {
  const ziele = {};
  for (const { id } of TAGESTYPEN) {
    ziele[id] = {};
    for (const feld of ZIEL_FELDER) {
      const wert = roh?.[id]?.[feld.id];
      const gueltig = typeof wert === 'number' && Number.isFinite(wert) && wert >= 0 && wert <= feld.max;
      ziele[id][feld.id] = gueltig ? wert : STANDARD_ZIELE[id][feld.id];
    }
  }
  return ziele;
}

export function bereinigeWoche(roh) {
  return STANDARD_WOCHE.map((standard, i) => (istTagestyp(roh?.[i]) ? roh[i] : standard));
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
