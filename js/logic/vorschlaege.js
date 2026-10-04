// Brom's Ernährungs-Hinweise: „Was fehlt heute noch?“ und Mikronährstoff-Tipps (reine Funktionen).
import { naehrwerteFuerMenge, NAEHRSTOFFE } from './naehrstoffe.js';
import { referenzwerte } from './referenzwerte.js';

export function rest(ist, typ) {
  return {
    kcal: Math.round(typ.kcal - (ist.kcal ?? 0)),
    protein: Math.round(typ.protein - (ist.protein ?? 0)),
  };
}

/**
 * Kombinationen aus 1–2 bekannten Lebensmitteln (Favoriten/zuletzt mit üblicher Menge), die den Rest gut treffen.
 * kandidaten: [{ lm, gramm }] → bis zu `anzahl` Vorschläge [{ teile: [{ lm, gramm }], kcal, protein, abweichung }]
 */
export function wasFehlt(restWerte, kandidaten, anzahl = 3) {
  if (restWerte.kcal < 80 && restWerte.protein < 8) return [];
  const mit = kandidaten.map((k) => ({ ...k, w: naehrwerteFuerMenge(k.lm.je100g, k.gramm) }));
  const optionen = [];
  const bewerte = (teile) => {
    const kcal = teile.reduce((s, t) => s + (t.w.kcal ?? 0), 0);
    const protein = teile.reduce((s, t) => s + (t.w.protein ?? 0), 0);
    if (kcal > restWerte.kcal * 1.12 + 40) return;
    // Protein ist wichtiger als die genaue kcal-Zahl
    const abweichung = Math.abs(restWerte.kcal - kcal) / Math.max(200, restWerte.kcal) + 2 * Math.max(0, restWerte.protein - protein) / Math.max(20, restWerte.protein);
    optionen.push({ teile: teile.map(({ lm, gramm }) => ({ lm, gramm })), kcal: Math.round(kcal), protein: Math.round(protein), abweichung });
  };
  mit.forEach((a, i) => {
    bewerte([a]);
    mit.slice(i + 1).forEach((b) => bewerte([a, b]));
  });
  optionen.sort((a, b) => a.abweichung - b.abweichung);
  const gesehen = new Set();
  return optionen.filter((o) => {
    const schluessel = o.teile.map((t) => t.lm.id).sort().join('+');
    if (gesehen.has(schluessel)) return false;
    gesehen.add(schluessel);
    return true;
  }).slice(0, anzahl);
}

/**
 * Mikronährstoffe unter 70 % der Referenz (Wochendurchschnitt) mit den besten Quellen je 100 kcal.
 * Liefert [{ schluessel, name, anteil, quellen: [lm…] }] (max. `anzahl`).
 */
export function mikroTipps(werte, referenzgruppe, typ, lebensmittel, anzahl = 3) {
  const ref = referenzwerte(referenzgruppe, typ);
  const luecken = Object.entries(ref)
    .filter(([k, r]) => r.art === 'ziel' && NAEHRSTOFFE[k] && (NAEHRSTOFFE[k].gruppe === 'vitamin' || NAEHRSTOFFE[k].gruppe === 'mineral') && k !== 'jod')
    .map(([k, r]) => ({ schluessel: k, name: NAEHRSTOFFE[k].name, anteil: Math.round(((werte[k] ?? 0) / r.wert) * 100) }))
    .filter((x) => x.anteil < 70)
    .sort((a, b) => a.anteil - b.anteil)
    .slice(0, anzahl);
  return luecken.map((l) => ({
    ...l,
    quellen: lebensmittel
      .filter((lm) => lm.quelle === 'usda_sr' && (lm.je100g[l.schluessel] ?? 0) > 0 && lm.je100g.kcal > 10 && lm.kategorie !== 'sonstiges')
      .sort((a, b) => b.je100g[l.schluessel] / b.je100g.kcal - a.je100g[l.schluessel] / a.je100g.kcal)
      .slice(0, 3),
  }));
}

// Schnelle Schätzwerte für auswärts (Richtwerte typischer Portionen)
export const SCHAETZWERTE = [
  { id: 'schaetz_doener', name: 'Döner Kebab (Portion)', stueckG: 400, je100g: { kcal: 190, protein: 10, kh: 18, fett: 8.5 } },
  { id: 'schaetz_pizza', name: 'Pizza Margherita (ganz)', stueckG: 350, je100g: { kcal: 250, protein: 10, kh: 32, fett: 9 } },
  { id: 'schaetz_burger_menue', name: 'Burger-Menü mit Pommes', stueckG: 450, je100g: { kcal: 250, protein: 9, kh: 28, fett: 11 } },
  { id: 'schaetz_currywurst', name: 'Currywurst mit Pommes', stueckG: 400, je100g: { kcal: 230, protein: 7, kh: 22, fett: 13 } },
  { id: 'schaetz_schnitzel', name: 'Schnitzel mit Pommes', stueckG: 450, je100g: { kcal: 220, protein: 12, kh: 18, fett: 11 } },
  { id: 'schaetz_sushi', name: 'Sushi (12 Stück)', stueckG: 350, je100g: { kcal: 150, protein: 6, kh: 28, fett: 1.5 } },
  { id: 'schaetz_brezel', name: 'Butterbrezel', stueckG: 120, je100g: { kcal: 320, protein: 8, kh: 46, fett: 11 } },
  { id: 'schaetz_leberkaese', name: 'Leberkäsesemmel', stueckG: 180, je100g: { kcal: 280, protein: 10, kh: 24, fett: 16 } },
  { id: 'schaetz_kaesespaetzle', name: 'Käsespätzle (Portion)', stueckG: 400, je100g: { kcal: 230, protein: 9, kh: 22, fett: 12 } },
  { id: 'schaetz_salat_bowl', name: 'Salat-Bowl mit Hähnchen', stueckG: 400, je100g: { kcal: 110, protein: 9, kh: 7, fett: 5 } },
  { id: 'schaetz_kuchen', name: 'Stück Kuchen', stueckG: 120, je100g: { kcal: 350, protein: 5, kh: 45, fett: 16 } },
  { id: 'schaetz_bier', name: 'Bier (0,5 l)', stueckG: 500, je100g: { kcal: 43, protein: 0.5, kh: 3.6, fett: 0, alkohol: 3.9 } },
].map((l) => ({ ...l, kategorie: 'auswaerts', quelle: 'schaetzung', unvollstaendig: true }));

/** Koffein in mg je Getränk/Portion (Richtwerte). */
export const KOFFEIN = { kaffee: 80, espresso: 60, energy: 80, mate: 20, gruener_tee: 30, cola: 35, preworkout: 200 };
export const KOFFEIN_GRENZE = 400; // EFSA: bis 400 mg/Tag für gesunde Erwachsene unbedenklich

/** Rezept auf eine andere Portionszahl skalieren (Zutaten anteilig, gekochtes Gewicht ebenfalls). */
export function skaliereRezept(rezept, neuePortionen) {
  const f = neuePortionen / Math.max(1, rezept.portionen || 1);
  return {
    ...rezept,
    portionen: neuePortionen,
    gewichtGekochtG: rezept.gewichtGekochtG ? Math.round(rezept.gewichtGekochtG * f) : rezept.gewichtGekochtG,
    zutaten: rezept.zutaten.map((z) => ({ ...z, gramm: Math.round(z.gramm * f * 10) / 10 })),
  };
}
