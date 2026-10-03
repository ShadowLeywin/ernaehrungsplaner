// Nährstoffe, die die App kennt. Schlüssel werden in lebensmittel.json und allen Einträgen verwendet.
// gruppe: makro | fett | vitamin | mineral

export const NAEHRSTOFFE = {
  kcal: { name: 'Energie', einheit: 'kcal', gruppe: 'makro' },
  protein: { name: 'Protein', einheit: 'g', gruppe: 'makro' },
  kh: { name: 'Kohlenhydrate', einheit: 'g', gruppe: 'makro' },
  zucker: { name: 'davon Zucker', einheit: 'g', gruppe: 'makro' },
  fett: { name: 'Fett', einheit: 'g', gruppe: 'makro' },
  ballaststoffe: { name: 'Ballaststoffe', einheit: 'g', gruppe: 'makro' },

  gesFett: { name: 'Gesättigte Fettsäuren', einheit: 'g', gruppe: 'fett' },
  omega3: { name: 'Omega-3 gesamt', einheit: 'g', gruppe: 'fett' },
  epaDha: { name: 'EPA + DHA', einheit: 'mg', gruppe: 'fett' },

  vitA: { name: 'Vitamin A', einheit: 'µg', gruppe: 'vitamin' },
  vitB1: { name: 'Vitamin B1', einheit: 'mg', gruppe: 'vitamin' },
  vitB2: { name: 'Vitamin B2', einheit: 'mg', gruppe: 'vitamin' },
  vitB3: { name: 'Niacin (B3)', einheit: 'mg', gruppe: 'vitamin' },
  vitB6: { name: 'Vitamin B6', einheit: 'mg', gruppe: 'vitamin' },
  folat: { name: 'Folat', einheit: 'µg', gruppe: 'vitamin' },
  vitB12: { name: 'Vitamin B12', einheit: 'µg', gruppe: 'vitamin' },
  vitC: { name: 'Vitamin C', einheit: 'mg', gruppe: 'vitamin' },
  vitD: { name: 'Vitamin D', einheit: 'µg', gruppe: 'vitamin' },
  vitE: { name: 'Vitamin E', einheit: 'mg', gruppe: 'vitamin' },
  vitK: { name: 'Vitamin K', einheit: 'µg', gruppe: 'vitamin' },

  calcium: { name: 'Calcium', einheit: 'mg', gruppe: 'mineral' },
  eisen: { name: 'Eisen', einheit: 'mg', gruppe: 'mineral' },
  magnesium: { name: 'Magnesium', einheit: 'mg', gruppe: 'mineral' },
  zink: { name: 'Zink', einheit: 'mg', gruppe: 'mineral' },
  kalium: { name: 'Kalium', einheit: 'mg', gruppe: 'mineral' },
  natrium: { name: 'Natrium', einheit: 'mg', gruppe: 'mineral' },
  phosphor: { name: 'Phosphor', einheit: 'mg', gruppe: 'mineral' },
  jod: { name: 'Jod', einheit: 'µg', gruppe: 'mineral' },
  selen: { name: 'Selen', einheit: 'µg', gruppe: 'mineral' },
};

export const KATEGORIEN = {
  obst: 'Obst',
  gemuese: 'Gemüse',
  getreide: 'Getreide & Brot',
  huelsenfruechte: 'Hülsenfrüchte & Soja',
  milch_ei: 'Milchprodukte & Eier',
  fleisch_fisch: 'Fleisch & Fisch',
  nuesse_samen: 'Nüsse & Samen',
  oele_fette: 'Öle & Fette',
  suesses: 'Süßes',
  getraenke: 'Getränke',
  sonstiges: 'Sonstiges',
};

/** Nährwerte für eine Menge in Gramm aus den Werten je 100 g. Unbekannte Nährstoffe bleiben unbekannt. */
export function naehrwerteFuerMenge(je100g, gramm) {
  const ergebnis = {};
  for (const [schluessel, wert] of Object.entries(je100g)) ergebnis[schluessel] = (wert * gramm) / 100;
  return ergebnis;
}

/** Fehlen wichtige Mikronährstoffe? (z. B. bei eigenen Richtwerten oder Open Food Facts) */
export function istUnvollstaendig(je100g) {
  const mikros = Object.entries(NAEHRSTOFFE).filter(([, n]) => n.gruppe === 'vitamin' || n.gruppe === 'mineral');
  const bekannt = mikros.filter(([k]) => je100g[k] != null).length;
  return bekannt < mikros.length / 2;
}
