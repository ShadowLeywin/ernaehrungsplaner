// Wochenplan und Einkaufsliste. Reine Funktionen.
// Ein Plan-Posten sieht aus wie ein Tagebuch-Eintrag (datum, slot, zutatId, name, gramm, je100), ist aber nur vorgemerkt.

import { rezeptWerte } from './rezepte.js';
import { SLOTS } from './ziele.js';
import { KATEGORIEN } from './zutat.js';

/** Erster Slot des Tages, für den noch nichts geplant ist; sonst das Mittagessen. */
export function naechsterFreierSlot(posten) {
  const belegt = new Set(posten.map((p) => p.slot));
  return SLOTS.find((s) => !belegt.has(s.id))?.id ?? 'mittag';
}

/** Plan-Posten in Tagebuch-Einträge verwandeln (ohne id, damit neue entstehen). */
export function alsEintraege(posten) {
  return posten.map(({ id, erstellt, uebernommen, ...rest }) => rest);
}

/**
 * Einkaufsliste aus den Plan-Posten einer Woche.
 * Rezepte werden in ihre Zutaten aufgelöst und auf die geplante Menge umgerechnet,
 * gleiche Zutaten zusammengezählt. rezepte und zutaten sind Maps nach id.
 * Liefert [{ schluessel, name, marke, kategorie, gramm, stueck }] sortiert nach Kategorie und Name.
 */
export function einkaufsliste(posten, rezepte, zutaten) {
  const summe = new Map();
  const merke = (zutatId, name, marke, gramm) => {
    if (!(gramm > 0)) return;
    const alt = summe.get(zutatId);
    if (alt) alt.gramm += gramm;
    else summe.set(zutatId, { schluessel: zutatId, name, marke: marke ?? '', gramm });
  };

  for (const p of posten) {
    const rezept = p.rezeptId ? rezepte.get(p.rezeptId) : null;
    // Geplant wird in Gramm auf dem Teller; bei vorgekochten Rezepten ist das das Gewicht nach dem Kochen
    const gesamt = rezept ? rezeptWerte(rezept).fertigGramm : 0;
    if (rezept && gesamt > 0) {
      const faktor = p.gramm / gesamt;
      for (const z of rezept.zutaten) merke(z.zutatId, z.name, z.marke, z.gramm * faktor);
    } else {
      // Zutat direkt geplant, oder das Rezept gibt es nicht mehr: dann steht der Posten als Ganzes auf der Liste
      merke(p.zutatId, p.name, p.marke, p.gramm);
    }
  }

  const rang = new Map(KATEGORIEN.map((k, i) => [k.id, i]));
  return [...summe.values()]
    .map((posten_) => {
      const zutat = zutaten.get(posten_.schluessel);
      const stueck = zutat?.portionen?.find((x) => x.name === 'Stück');
      return {
        ...posten_,
        kategorie: rang.has(zutat?.kategorie) ? zutat.kategorie : 'sonstiges',
        // Äpfel kauft man in Stück, nicht in Gramm: aufgerundet als Orientierung
        stueck: stueck ? Math.ceil(posten_.gramm / stueck.gramm - 0.05) : null,
      };
    })
    .sort((a, b) => rang.get(a.kategorie) - rang.get(b.kategorie) || a.name.localeCompare(b.name, 'de'));
}

/** Mengenangabe für die Liste: ab 1 kg in Kilogramm, darunter gerundet auf 5 g */
export function mengeText(gramm) {
  if (gramm >= 1000) return `${(Math.round(gramm / 10) / 100).toLocaleString('de-DE')} kg`;
  const rund = gramm < 20 ? Math.ceil(gramm) : Math.ceil(gramm / 5) * 5;
  return `${rund} g`;
}

/** Die offene Liste als Text zum Teilen oder Kopieren */
export function listeAlsText(liste, eigene, erledigt, titel) {
  const zeilen = [titel];
  for (const p of liste) {
    if (erledigt.has(p.schluessel)) continue;
    zeilen.push(`- ${p.name}${p.marke ? ` (${p.marke})` : ''}: ${mengeText(p.gramm)}${p.stueck ? `, etwa ${p.stueck} Stück` : ''}`);
  }
  for (const e of eigene) if (!e.erledigt) zeilen.push(`- ${e.name}`);
  return zeilen.join('\n');
}
