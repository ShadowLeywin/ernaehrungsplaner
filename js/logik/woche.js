// Woche: Tage einer Kalenderwoche, Wochenschnitt, Kopieren von Einträgen. Reine Funktionen.

import { verschiebe, wochentagIndex } from './datum.js';
import { summeEintraege } from './naehrwerte.js';

/** Die sieben Tage (Montag bis Sonntag) der Woche, in der das Datum liegt. */
export function wochenTage(datum) {
  const montag = verschiebe(datum, -wochentagIndex(datum));
  return Array.from({ length: 7 }, (_, i) => verschiebe(montag, i));
}

/**
 * Durchschnitt je Tag über die Tage, an denen etwas eingetragen ist.
 * Leere Tage zählen nicht mit: ein vergessener Tag soll den Schnitt nicht halbieren.
 */
export function wochenSchnitt(eintraege) {
  const tage = new Set(eintraege.map((e) => e.datum));
  const gesamt = summeEintraege(eintraege);
  const schnitt = Object.fromEntries(Object.entries(gesamt).map(([id, wert]) => [id, wert / (tage.size || 1)]));
  return { tage: tage.size, schnitt };
}

/** Einträge für ein anderes Datum (und wahlweise einen anderen Slot) vorbereiten: ohne id, damit neue entstehen. */
export function kopiereEintraege(eintraege, zielDatum, zielSlot = null) {
  return eintraege.map(({ id, erstellt, ...rest }) => ({ ...rest, datum: zielDatum, slot: zielSlot ?? rest.slot }));
}
