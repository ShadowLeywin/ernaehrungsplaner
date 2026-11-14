// Nährstoffe: Liste, Umrechnung auf eine Menge, Summen. Reine Funktionen ohne Browser-Zugriff.

/** Alle Nährstoffe, die die App kennt. Werte gelten immer je 100 g. */
export const NAEHRSTOFFE = [
  { id: 'kcal', name: 'Energie', einheit: 'kcal', gruppe: 'makro' },
  { id: 'protein', name: 'Eiweiß', einheit: 'g', gruppe: 'makro' },
  { id: 'kh', name: 'Kohlenhydrate', einheit: 'g', gruppe: 'makro' },
  { id: 'zucker', name: 'davon Zucker', einheit: 'g', gruppe: 'makro', unter: 'kh' },
  { id: 'fett', name: 'Fett', einheit: 'g', gruppe: 'makro' },
  { id: 'gesFett', name: 'davon gesättigt', einheit: 'g', gruppe: 'makro', unter: 'fett' },
  { id: 'ballaststoffe', name: 'Ballaststoffe', einheit: 'g', gruppe: 'makro' },
  { id: 'salz', name: 'Salz', einheit: 'g', gruppe: 'makro' },
  { id: 'omega3', name: 'Omega-3', einheit: 'g', gruppe: 'mikro' },
  { id: 'epaDha', name: 'EPA + DHA', einheit: 'g', gruppe: 'mikro' },
  { id: 'vitA', name: 'Vitamin A', einheit: 'µg', gruppe: 'mikro' },
  { id: 'vitB1', name: 'Vitamin B1', einheit: 'mg', gruppe: 'mikro' },
  { id: 'vitB2', name: 'Vitamin B2', einheit: 'mg', gruppe: 'mikro' },
  { id: 'vitB3', name: 'Niacin (B3)', einheit: 'mg', gruppe: 'mikro' },
  { id: 'vitB6', name: 'Vitamin B6', einheit: 'mg', gruppe: 'mikro' },
  { id: 'folat', name: 'Folat', einheit: 'µg', gruppe: 'mikro' },
  { id: 'vitB12', name: 'Vitamin B12', einheit: 'µg', gruppe: 'mikro' },
  { id: 'vitC', name: 'Vitamin C', einheit: 'mg', gruppe: 'mikro' },
  { id: 'vitD', name: 'Vitamin D', einheit: 'µg', gruppe: 'mikro' },
  { id: 'vitE', name: 'Vitamin E', einheit: 'mg', gruppe: 'mikro' },
  { id: 'vitK', name: 'Vitamin K', einheit: 'µg', gruppe: 'mikro' },
  { id: 'calcium', name: 'Calcium', einheit: 'mg', gruppe: 'mikro' },
  { id: 'eisen', name: 'Eisen', einheit: 'mg', gruppe: 'mikro' },
  { id: 'magnesium', name: 'Magnesium', einheit: 'mg', gruppe: 'mikro' },
  { id: 'zink', name: 'Zink', einheit: 'mg', gruppe: 'mikro' },
  { id: 'kalium', name: 'Kalium', einheit: 'mg', gruppe: 'mikro' },
  { id: 'natrium', name: 'Natrium', einheit: 'mg', gruppe: 'mikro' },
  { id: 'phosphor', name: 'Phosphor', einheit: 'mg', gruppe: 'mikro' },
  { id: 'selen', name: 'Selen', einheit: 'µg', gruppe: 'mikro' },
  { id: 'jod', name: 'Jod', einheit: 'µg', gruppe: 'mikro' },
];

/** Die vier Werte, die im Tagebuch gegen ein Ziel laufen (neben kcal). */
export const MAKROS = ['protein', 'kh', 'fett', 'ballaststoffe'];

const istZahl = (wert) => typeof wert === 'number' && Number.isFinite(wert);

/** Nährwerte je 100 g auf eine Menge in Gramm umrechnen. Fehlende Werte bleiben weg. */
export function fuerMenge(je100, gramm) {
  const ergebnis = {};
  if (!je100 || !istZahl(gramm) || gramm < 0) return ergebnis;
  for (const [id, wert] of Object.entries(je100)) {
    if (istZahl(wert)) ergebnis[id] = (wert * gramm) / 100;
  }
  return ergebnis;
}

/** Mehrere Nährwert-Objekte addieren. */
export function summe(liste) {
  const ergebnis = {};
  for (const werte of liste) {
    for (const [id, wert] of Object.entries(werte ?? {})) {
      if (istZahl(wert)) ergebnis[id] = (ergebnis[id] ?? 0) + wert;
    }
  }
  return ergebnis;
}

/** Summe aller Tagebuch-Einträge (jeder hat gramm und je100). */
export const summeEintraege = (eintraege) => summe(eintraege.map((e) => fuerMenge(e.je100, e.gramm)));

/**
 * Welche der gefragten Nährstoffe fehlen bei mindestens einem Eintrag?
 * Eine Summe mit Lücken ist eine Untergrenze, kein genauer Wert.
 */
export function luecken(eintraege, ids) {
  return ids.filter((id) => eintraege.some((e) => !istZahl(e.je100?.[id])));
}

/** Brennwert aus den Makros: 4 kcal je g Eiweiß und Kohlenhydrate, 9 je g Fett, 2 je g Ballaststoffe. */
export function kcalAusMakros({ protein = 0, kh = 0, fett = 0, ballaststoffe = 0 }) {
  return 4 * protein + 4 * kh + 9 * fett + 2 * ballaststoffe;
}

export function runde(wert, stellen = 0) {
  const faktor = 10 ** stellen;
  return Math.round((wert + Number.EPSILON) * faktor) / faktor;
}
