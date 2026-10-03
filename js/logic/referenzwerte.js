// Referenzwerte für die Nährstoffzufuhr pro Tag.
// Quelle: DGE-Referenzwerte (Deutsche Gesellschaft für Ernährung, dge.de) für Erwachsene;
// Obergrenzen (UL) nach EFSA. Orientierungswerte, keine medizinische Beratung.
// art: 'ziel' = mindestens erreichen · 'begrenzen' = möglichst darunter bleiben

export const REFERENZGRUPPEN = {
  maenner_19_25: 'Männer 19–24 Jahre',
  maenner_25_51: 'Männer ab 25 Jahre',
  frauen_19_25: 'Frauen 19–24 Jahre',
  frauen_25_51: 'Frauen ab 25 Jahre',
};

const BEIDE = { folat: 300, vitB12: 4, vitD: 20, calcium: 1000, kalium: 4000, phosphor: 700, jod: 200 };

const MAENNER = {
  ...BEIDE, vitA: 850, vitB2: 1.4, vitB6: 1.6, vitC: 110, vitK: 70, eisen: 11, zink: 14, selen: 70,
};
const FRAUEN = {
  ...BEIDE, vitA: 700, vitB2: 1.1, vitB6: 1.4, vitC: 95, vitK: 60, eisen: 16, zink: 8, selen: 60,
};

const WERTE = {
  maenner_19_25: { ...MAENNER, vitB1: 1.3, vitB3: 16, vitE: 15, magnesium: 400 },
  maenner_25_51: { ...MAENNER, vitB1: 1.2, vitB3: 15, vitE: 14, magnesium: 350 },
  frauen_19_25: { ...FRAUEN, vitB1: 1.0, vitB3: 13, vitE: 12, magnesium: 310 },
  frauen_25_51: { ...FRAUEN, vitB1: 1.0, vitB3: 12, vitE: 12, magnesium: 300 },
};

// Tolerierbare Obergrenzen (EFSA) für Gesamtzufuhr inkl. Supplements
const OBERGRENZEN = { vitA: 3000, vitD: 100, vitB6: 12, zink: 25, selen: 255, jod: 600, calcium: 2500 };

/** Referenzwerte für einen Tag: Mikros nach Gruppe, Rest aus dem Tagestyp. */
export function referenzwerte(referenzgruppe, typ) {
  const basis = WERTE[referenzgruppe] ?? WERTE.maenner_19_25;
  const ergebnis = {};
  for (const [k, wert] of Object.entries(basis)) {
    ergebnis[k] = { wert, art: 'ziel', obergrenze: OBERGRENZEN[k] };
  }
  ergebnis.ballaststoffe = { wert: typ.ballaststoffeMinG, art: 'ziel' };
  ergebnis.epaDha = { wert: 250, art: 'ziel' }; // EFSA
  ergebnis.gesFett = { wert: Math.round((typ.kcal * 0.1) / 9), art: 'begrenzen' }; // < 10 % der Energie
  ergebnis.natrium = { wert: 2000, art: 'begrenzen' }; // WHO: < 2 g Natrium (≈ 5 g Salz)
  return ergebnis;
}

/** Bewertung eines Werts gegen seine Referenz: Anteil in % und Status für die Anzeige. */
export function bewerte(wert, referenz) {
  const anteil = referenz.wert > 0 ? Math.round((wert / referenz.wert) * 100) : 0;
  let status;
  if (referenz.obergrenze && wert > referenz.obergrenze) status = 'ueber_obergrenze';
  else if (referenz.art === 'begrenzen') status = wert > referenz.wert ? 'zu_viel' : 'ok';
  else status = anteil >= 100 ? 'erreicht' : anteil >= 70 ? 'fast' : 'niedrig';
  return { anteil, status };
}
