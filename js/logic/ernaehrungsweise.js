// Ernährungsweisen, Unverträglichkeiten und Diäten – drei getrennte Listen (reine Funktionen).
// Eignung der Lebensmittel wird aus Kategorie und ID abgeleitet; eigene Lebensmittel können Flags mitbringen.

export const ERNAEHRUNGSWEISEN = {
  alles: { name: 'Alles', text: 'Keine Einschränkung' },
  flexitarisch: { name: 'Flexitarisch', text: 'Überwiegend pflanzlich, Fleisch selten (nur Hinweis, kein Ausschluss)' },
  pescetarisch: { name: 'Pescetarisch', text: 'Kein Fleisch, aber Fisch' },
  vegetarisch: { name: 'Vegetarisch', text: 'Kein Fleisch und Fisch' },
  vegan: { name: 'Vegan', text: 'Keine tierischen Produkte' },
};

export const UNVERTRAEGLICHKEITEN = {
  laktosefrei: { name: 'Laktosefrei' },
  glutenfrei: { name: 'Glutenfrei' },
  nussfrei: { name: 'Ohne Nüsse' },
};

export const DIAETEN = {
  keine: { name: 'Keine', text: 'Makros nach deinem Profil' },
  highprotein: { name: 'High Protein', text: 'Protein 2,2 g/kg, Rest wie gehabt' },
  lowcarb: { name: 'Low Carb', text: 'Höchstens 100 g Kohlenhydrate, Rest über Fett' },
  keto: { name: 'Ketogen', text: 'Höchstens 30 g Kohlenhydrate, viel Fett' },
  lowfat: { name: 'Low Fat', text: 'Fett ca. 20 % der Kalorien' },
  mediterran: { name: 'Mediterran', text: 'Fett ca. 35 % (Olivenöl, Nüsse, Fisch), viel Gemüse' },
  intervallfasten: { name: 'Intervallfasten 16:8', text: 'Essen in einem 8-Stunden-Fenster, Makros unverändert' },
};

const FLEISCH = new Set(['haehnchenbrust', 'putenbrust', 'rinderhack', 'rinderhack_mager', 'schweinefilet', 'kochschinken']);
const FISCH = new Set(['lachs', 'thunfisch_dose', 'kabeljau', 'seelachs', 'garnelen', 'makrele', 'hering', 'sardinen']);
const TIERISCH_SONST = new Set(['honig', 'manuka_honig', 'whey', 'butter']);
const LAKTOSE = new Set(['milch_vollmilch', 'milch_fettarm', 'joghurt', 'griechischer_joghurt', 'huettenkaese', 'mozzarella', 'frischkaese', 'butter', 'skyr', 'magerquark', 'feta', 'whey']);
// Gereifte Hartkäse sind praktisch laktosefrei
const GLUTEN = new Set(['weizenmehl', 'vollkornmehl', 'dinkel', 'nudeln', 'vollkornnudeln', 'couscous', 'bulgur', 'vollkornbrot', 'roggenbrot', 'toast', 'knaeckebrot', 'tortilla', 'sojasauce']);
// Hafer ist oft mit Gluten verunreinigt – nur als „glutenfrei“ gekennzeichnete Ware
const GLUTEN_HINWEIS = new Set(['haferflocken']);
const NUESSE = new Set(['mandeln', 'walnuesse', 'haselnuesse', 'cashews', 'paranuesse', 'erdnuesse', 'erdnussbutter']);

/** Eigenschaften eines Lebensmittels: { fleisch, fisch, tierisch, laktose, gluten, glutenHinweis, nuesse } */
export function eigenschaften(lm) {
  if (lm.flags) return { glutenHinweis: false, ...lm.flags };
  const id = lm.id;
  const fleisch = FLEISCH.has(id);
  const fisch = FISCH.has(id);
  return {
    fleisch,
    fisch,
    tierisch: fleisch || fisch || lm.kategorie === 'milch_ei' || TIERISCH_SONST.has(id),
    laktose: LAKTOSE.has(id),
    gluten: GLUTEN.has(id),
    glutenHinweis: GLUTEN_HINWEIS.has(id),
    nuesse: NUESSE.has(id),
  };
}

/**
 * Passt ein Lebensmittel zur Einstellung? einstellung: { weise, unvertraeglich: [] }
 * Liefert { passt, gruende: [Text], hinweise: [Text] }
 */
export function pruefeLebensmittel(lm, einstellung = {}) {
  const e = eigenschaften(lm);
  const gruende = [];
  const hinweise = [];
  const weise = einstellung.weise ?? 'alles';
  if (weise === 'vegan' && e.tierisch) gruende.push('nicht vegan');
  if (weise === 'vegetarisch' && (e.fleisch || e.fisch)) gruende.push('nicht vegetarisch');
  if (weise === 'pescetarisch' && e.fleisch) gruende.push('enthält Fleisch');
  if (weise === 'flexitarisch' && e.fleisch) hinweise.push('Fleisch – lieber selten');
  const unv = einstellung.unvertraeglich ?? [];
  if (unv.includes('laktosefrei') && e.laktose) gruende.push('enthält Laktose');
  if (unv.includes('glutenfrei') && e.gluten) gruende.push('enthält Gluten');
  if (unv.includes('glutenfrei') && e.glutenHinweis) hinweise.push('nur glutenfrei gekennzeichnet');
  if (unv.includes('nussfrei') && e.nuesse) gruende.push('enthält Nüsse');
  return { passt: !gruende.length, gruende, hinweise };
}

/**
 * Makro-Vorschlag für eine Diät bei gleichen Kalorien. typ: { kcal, protein, kh, fett }
 * Liefert { protein, kh, fett } (gerundet) oder null bei „keine“/„intervallfasten“.
 */
export function diaetMakros(typ, diaet, kgKoerper) {
  const kcal = typ.kcal;
  const fettAus = (rest) => Math.max(0, Math.round(rest / 9));
  const khAus = (rest) => Math.max(0, Math.round(rest / 4));
  switch (diaet) {
    case 'highprotein': {
      const protein = Math.round(2.2 * kgKoerper);
      const rest = kcal - protein * 4;
      const anteilKh = typ.kh * 4 / Math.max(1, typ.kh * 4 + typ.fett * 9);
      const kh = khAus(rest * anteilKh);
      return { protein, kh, fett: fettAus(rest - kh * 4) };
    }
    case 'lowcarb': {
      const kh = Math.min(100, typ.kh);
      return { protein: typ.protein, kh, fett: fettAus(kcal - typ.protein * 4 - kh * 4) };
    }
    case 'keto': {
      const kh = Math.min(30, typ.kh);
      // Protein moderat (max. 2 g/kg), damit Ketose möglich bleibt
      const protein = Math.min(typ.protein, Math.round(2 * kgKoerper));
      return { protein, kh, fett: fettAus(kcal - protein * 4 - kh * 4) };
    }
    case 'lowfat': {
      const fett = Math.round((kcal * 0.2) / 9);
      return { protein: typ.protein, kh: khAus(kcal - typ.protein * 4 - fett * 9), fett };
    }
    case 'mediterran': {
      const fett = Math.round((kcal * 0.35) / 9);
      return { protein: typ.protein, kh: khAus(kcal - typ.protein * 4 - fett * 9), fett };
    }
    default:
      return null;
  }
}

/** Liegt eine Uhrzeit im Essensfenster („12:00“–„20:00“)? */
export function imEssensfenster(datum, von, bis) {
  const minuten = datum.getHours() * 60 + datum.getMinutes();
  const [vh, vm] = von.split(':').map(Number);
  const [bh, bm] = bis.split(':').map(Number);
  return minuten >= vh * 60 + vm && minuten < bh * 60 + bm;
}
