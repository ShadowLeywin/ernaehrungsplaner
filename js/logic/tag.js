// Tagesrechnung: Einträge, Summen pro Mahlzeit, Tag und Woche (reine Funktionen).
// Eintrag: { id, mahlzeit, lebensmittelId, gramm, zeit }
import { naehrwerteFuerMenge } from './naehrstoffe.js';
import { summiere, naehrwerteZutaten, naehrwerteSupplement } from './fixeintraege.js';
import { datumSchluessel } from './ziele.js';

export function eintragNaehrwerte(eintrag, lebensmittel) {
  const lm = lebensmittel.find((l) => l.id === eintrag.lebensmittelId);
  return lm ? naehrwerteFuerMenge(lm.je100g, eintrag.gramm) : {};
}

export function mahlzeitSumme(tag, mahlzeitId, lebensmittel) {
  return summiere(tag.eintraege
    .filter((e) => e.mahlzeit === mahlzeitId)
    .map((e) => eintragNaehrwerte(e, lebensmittel)));
}

/** Was an diesem Tag tatsächlich gegessen/genommen wurde: Einträge + Morning Stack (falls getrunken) + abgehakte Supplements. */
export function tagesNaehrwerte(tag, profil, lebensmittel) {
  const teile = tag.eintraege.map((e) => eintragNaehrwerte(e, lebensmittel));
  if (profil.morningStack.aktiv && tag.morningStackGenommen) {
    teile.push(naehrwerteZutaten(profil.morningStack.zutaten, lebensmittel));
  }
  for (const s of profil.supplements) {
    if (s.aktiv && tag.supplements[s.id]) teile.push(naehrwerteSupplement(s, lebensmittel));
  }
  return summiere(teile);
}

/** Gramm Gemüse und Obst für die Tagesziele (Kartoffeln zählen nicht als Gemüse). */
export function gemueseObstGramm(tag, lebensmittel) {
  const ergebnis = { gemuese: 0, obst: 0 };
  for (const e of tag.eintraege) {
    const lm = lebensmittel.find((l) => l.id === e.lebensmittelId);
    if (!lm || lm.keinGemueseZiel) continue;
    if (lm.kategorie === 'gemuese') ergebnis.gemuese += e.gramm;
    if (lm.kategorie === 'obst') ergebnis.obst += e.gramm;
  }
  return ergebnis;
}

/** Datumsschlüssel Montag bis Sonntag der Woche, in der `datum` liegt. */
export function wochenSchluessel(datum) {
  const montag = new Date(datum.getFullYear(), datum.getMonth(), datum.getDate() - ((datum.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => datumSchluessel(
    new Date(montag.getFullYear(), montag.getMonth(), montag.getDate() + i)));
}

/** Durchschnitt pro Tag über alle Tage mit mindestens einem Eintrag. */
export function wochenDurchschnitt(tage, profil, lebensmittel) {
  const mitEintraegen = tage.filter((t) => t.eintraege.length);
  if (!mitEintraegen.length) return { tage: 0, werte: {}, gemueseObst: { gemuese: 0, obst: 0 } };
  const n = mitEintraegen.length;
  const teile = (werte) => Object.fromEntries(Object.entries(werte).map(([k, v]) => [k, v / n]));
  return {
    tage: n,
    werte: teile(summiere(mitEintraegen.map((t) => tagesNaehrwerte(t, profil, lebensmittel)))),
    gemueseObst: teile(summiere(mitEintraegen.map((t) => gemueseObstGramm(t, lebensmittel)))),
  };
}

export function neueEintragsId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
