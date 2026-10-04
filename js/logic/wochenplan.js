// Wochenplan, Einkaufsliste und Obst-/Gemüse-Vorlieben (reine Funktionen).
//
// Gespeichert: einstellungen/wochenplaene = { '<Montag>': { tage: [ { <mahlzeitId>: [Posten] } × 7 ] } }
// Posten: { id: lebensmittelId oder 'rezept:<id>', gramm }
// einstellungen/praeferenzen = { <lebensmittelId>: 0–10 }  (0 = mag ich nie)
// Austauschdatei wochenpraeferenzen.json: { schema_version: 1, erstellt_am, bewertungen: { <id>: 0–10 } }
import { naehrwerteFuerMenge } from './naehrstoffe.js';
import { summiere } from './fixeintraege.js';
import { fertigGewicht } from './rezepte.js';

export const PRAEFERENZ_SCHEMA = 1;

export function leererPlan() {
  return { tage: Array.from({ length: 7 }, () => ({})) };
}

/** Alle Posten eines Plantags als Liste [{ mahlzeit, posten }]. */
export function postenDesTages(tagPlan) {
  return Object.entries(tagPlan ?? {}).flatMap(([mahlzeit, liste]) => liste.map((posten) => ({ mahlzeit, posten })));
}

/** Nährwerte eines Plantags (Rezepte sind als rezept:<id> in der Lebensmittelliste enthalten). */
export function planTagNaehrwerte(tagPlan, lebensmittel) {
  const nachId = new Map(lebensmittel.map((l) => [l.id, l]));
  return summiere(postenDesTages(tagPlan).map(({ posten }) => {
    const lm = nachId.get(posten.id);
    return lm ? naehrwerteFuerMenge(lm.je100g, posten.gramm) : {};
  }));
}

/** Plantag als Tageseinträge (zum Übernehmen in den echten Tag). */
export function planAlsEintraege(tagPlan, neueId, jetzt = new Date()) {
  return postenDesTages(tagPlan).map(({ mahlzeit, posten }) => ({
    id: neueId(), mahlzeit, lebensmittelId: posten.id, gramm: posten.gramm, zeit: jetzt.toISOString(), geplant: true,
  }));
}

/**
 * Einkaufsliste aus einem Wochenplan: Rezepte werden in ihre Zutaten aufgelöst (anteilig nach Gramm).
 * Liefert [{ lebensmittelId, gramm }] nach Menge absteigend.
 */
export function einkaufsliste(plan, rezepte) {
  const rezeptNachId = new Map(rezepte.map((r) => [`rezept:${r.id}`, r]));
  const summe = new Map();
  const add = (id, g) => summe.set(id, (summe.get(id) ?? 0) + g);
  for (const tagPlan of plan?.tage ?? []) {
    for (const { posten } of postenDesTages(tagPlan)) {
      const rezept = rezeptNachId.get(posten.id);
      if (rezept) {
        const anteil = posten.gramm / Math.max(1, fertigGewicht(rezept));
        for (const z of rezept.zutaten) add(z.lebensmittelId, z.gramm * anteil);
      } else {
        add(posten.id, posten.gramm);
      }
    }
  }
  return [...summe.entries()]
    .map(([lebensmittelId, gramm]) => ({ lebensmittelId, gramm: Math.round(gramm) }))
    .sort((a, b) => b.gramm - a.gramm);
}

/** Einkaufsmenge sinnvoll runden: Stückzahl, wenn ein Stückgewicht bekannt ist. */
export function einkaufsMenge(gramm, lm) {
  if (lm?.stueckG && lm.kategorie !== 'rezept') {
    const stueck = Math.max(1, Math.ceil(gramm / lm.stueckG));
    return { text: `${stueck} Stück`, gramm };
  }
  if (gramm >= 1000) return { text: `${(Math.round(gramm / 100) / 10).toString().replace('.', ',')} kg`, gramm };
  return { text: `${Math.round(gramm / 10) * 10 || gramm} g`, gramm };
}

/** Vorlieben prüfen und importieren. Liefert { bewertungen } oder { fehler }. */
export function pruefePraeferenzen(text, bekannteIds) {
  let daten;
  try { daten = JSON.parse(text); } catch { return { fehler: 'Die Datei ist kein gültiges JSON.' }; }
  if (daten?.schema_version !== PRAEFERENZ_SCHEMA) return { fehler: 'Unbekannte Version der Vorlieben-Datei.' };
  if (typeof daten.bewertungen !== 'object' || !daten.bewertungen) return { fehler: 'Keine Bewertungen enthalten.' };
  const bewertungen = {};
  for (const [id, note] of Object.entries(daten.bewertungen)) {
    if (!bekannteIds.has(id)) continue;
    if (Number.isInteger(note) && note >= 0 && note <= 10) bewertungen[id] = note;
  }
  return { bewertungen };
}

export function exportierePraeferenzen(bewertungen, jetzt = new Date()) {
  return { schema_version: PRAEFERENZ_SCHEMA, erstellt_am: jetzt.toISOString(), bewertungen };
}

/** Vorschläge für Obst/Gemüse: beste Noten zuerst, Angebote bevorzugt, 0 = nie. */
export function obstGemueseVorschlaege(lebensmittel, bewertungen, angebotsIds = new Set(), anzahl = 6) {
  return lebensmittel
    .filter((l) => (l.kategorie === 'obst' || l.kategorie === 'gemuese') && !l.keinGemueseZiel)
    .map((l) => ({ lm: l, note: bewertungen[l.id] ?? 5, angebot: angebotsIds.has(l.id) }))
    .filter((x) => x.note > 0)
    .sort((a, b) => (b.note + (b.angebot ? 2 : 0)) - (a.note + (a.angebot ? 2 : 0)))
    .slice(0, anzahl);
}
