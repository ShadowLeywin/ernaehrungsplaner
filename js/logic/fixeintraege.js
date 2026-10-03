// Feste tägliche Einträge: Morning Stack und Supplements (reine Funktionen).
import { naehrwerteFuerMenge } from './naehrstoffe.js';

/** Mehrere Nährwert-Objekte addieren. Ein Nährstoff zählt, sobald er irgendwo bekannt ist. */
export function summiere(liste) {
  const summe = {};
  for (const werte of liste) {
    for (const [k, v] of Object.entries(werte)) summe[k] = (summe[k] ?? 0) + v;
  }
  return summe;
}

/** Zutaten [{ lebensmittelId, gramm }] mit der Lebensmittelliste in Nährwerte umrechnen. */
export function naehrwerteZutaten(zutaten, lebensmittel) {
  return summiere(zutaten.map((z) => {
    const lm = lebensmittel.find((l) => l.id === z.lebensmittelId);
    if (!lm) throw new Error(`Unbekanntes Lebensmittel: ${z.lebensmittelId}`);
    return naehrwerteFuerMenge(lm.je100g, z.gramm);
  }));
}

/** Supplement: entweder aus Zutaten der Datenbank oder mit eigenen Werten pro Tagesportion. */
export function naehrwerteSupplement(supplement, lebensmittel) {
  if (supplement.zutaten) return naehrwerteZutaten(supplement.zutaten, lebensmittel);
  return { ...(supplement.naehrwerte ?? {}) };
}

/** Alle festen Einträge eines Tages: Morning Stack und aktive Supplements. */
export function fixeNaehrwerte(profil, lebensmittel) {
  const morningStack = profil.morningStack.aktiv
    ? naehrwerteZutaten(profil.morningStack.zutaten, lebensmittel)
    : {};
  const supplements = profil.supplements
    .filter((s) => s.aktiv)
    .map((s) => ({ id: s.id, werte: naehrwerteSupplement(s, lebensmittel) }));
  return { morningStack, supplements, gesamt: summiere([morningStack, ...supplements.map((s) => s.werte)]) };
}
