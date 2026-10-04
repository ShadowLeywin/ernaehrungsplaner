// Rezepte und Meal-Prep (reine Funktionen).
// Rezept: { id, name, art, portionen, zutaten: [{ lebensmittelId, gramm }], gewichtGekochtG?, zubereitung,
//           bewertung: { gesamt, geschmack, saettigung, aufwand, preis } (1–10), tags: [], geschmackText,
//           vorteile, notiz, wiederEssen, erstelltAm }
// Ein Rezept wird als „Lebensmittel“ rezept:<id> eintragbar: Nährwerte je 100 g fertigem Gericht.
import { naehrwerteFuerMenge } from './naehrstoffe.js';
import { summiere } from './fixeintraege.js';

export const REZEPT_ARTEN = {
  gericht: { name: 'Gericht', episch: 'Mahl' },
  fruehstueck: { name: 'Frühstück', episch: 'Morgenmahl' },
  snack: { name: 'Snack', episch: 'Wegzehrung' },
  trank: { name: 'Shake & Smoothie', episch: 'Trank' },
  backwerk: { name: 'Gebäck & Brot', episch: 'Backwerk' },
  suess: { name: 'Süßes', episch: 'Naschwerk' },
};

export const BEWERTUNGEN = {
  geschmack: 'Geschmack',
  saettigung: 'Sättigung',
  aufwand: 'Aufwand (10 = schnell)',
  preis: 'Preis (10 = günstig)',
};

export const STANDARD_PORTIONEN_MEALPREP = 7;

export function neuesRezept(id, art = 'gericht') {
  return {
    id, name: '', art, portionen: 1, zutaten: [], gewichtGekochtG: null, zubereitung: '',
    bewertung: { gesamt: null, geschmack: null, saettigung: null, aufwand: null, preis: null },
    tags: [], geschmackText: '', vorteile: '', notiz: '', wiederEssen: true, erstelltAm: null,
  };
}

/** Nährwerte des ganzen Rezepts (Summe aller Zutaten). */
export function rezeptGesamt(rezept, lebensmittel) {
  const nachId = new Map(lebensmittel.map((l) => [l.id, l]));
  return summiere(rezept.zutaten
    .map((z) => nachId.get(z.lebensmittelId))
    .map((lm, i) => (lm ? naehrwerteFuerMenge(lm.je100g, rezept.zutaten[i].gramm) : {})));
}

export const rohGewicht = (rezept) => rezept.zutaten.reduce((s, z) => s + (z.gramm || 0), 0);

/** Gewicht des fertigen Gerichts: gewogen (Meal-Prep) oder Summe der Zutaten. */
export const fertigGewicht = (rezept) => (rezept.gewichtGekochtG > 0 ? rezept.gewichtGekochtG : rohGewicht(rezept));

export function portionsGewicht(rezept) {
  return fertigGewicht(rezept) / Math.max(1, rezept.portionen || 1);
}

export function proPortion(rezept, lebensmittel) {
  const gesamt = rezeptGesamt(rezept, lebensmittel);
  const n = Math.max(1, rezept.portionen || 1);
  return Object.fromEntries(Object.entries(gesamt).map(([k, v]) => [k, v / n]));
}

/** Meal-Prep: Gesamtgewicht nach dem Kochen ÷ Portionen. */
export function mealPrep({ gesamtGewichtG, portionen, gesamtNaehrwerte }) {
  const n = Math.max(1, Math.round(portionen || 1));
  return {
    portionsGewichtG: gesamtGewichtG / n,
    proPortion: Object.fromEntries(Object.entries(gesamtNaehrwerte ?? {}).map(([k, v]) => [k, v / n])),
  };
}

/** Rezept als eintragbares Lebensmittel (je 100 g fertiges Gericht, 1 „Stück“ = 1 Portion). */
export function rezeptAlsLebensmittel(rezept, lebensmittel) {
  const gewicht = fertigGewicht(rezept);
  if (!gewicht || !rezept.zutaten.length) return null;
  const gesamt = rezeptGesamt(rezept, lebensmittel);
  return {
    id: `rezept:${rezept.id}`,
    name: rezept.name || 'Rezept ohne Namen',
    kategorie: 'rezept',
    stueckG: Math.round(portionsGewicht(rezept)),
    quelle: 'rezept',
    je100g: Object.fromEntries(Object.entries(gesamt).map(([k, v]) => [k, (v / gewicht) * 100])),
  };
}

/** Gesamtnote: eigene Note oder Schnitt der Teilnoten. */
export function gesamtNote(rezept) {
  const b = rezept.bewertung ?? {};
  if (b.gesamt) return b.gesamt;
  const teile = Object.keys(BEWERTUNGEN).map((k) => b[k]).filter((x) => x > 0);
  return teile.length ? Math.round((teile.reduce((s, x) => s + x, 0) / teile.length) * 10) / 10 : null;
}
