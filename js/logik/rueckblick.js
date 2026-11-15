// Wochenrückblick für „Fortschritt“: die letzten 7 Tage gegen die 7 Tage davor. Reine Funktionen.
// Gleitende Wochen statt Kalenderwochen: Am Montag wäre eine Kalenderwoche fast leer.
// Die App bewertet nicht: Sie zeigt Schnitte und Änderungen, keine Urteile.

import { gleitenderSchnitt } from './gesundheit.js';
import { summeEintraege } from './naehrwerte.js';
import { verschiebe } from './datum.js';

const schnitt = (werte) => (werte.length ? werte.reduce((a, b) => a + b, 0) / werte.length : null);

/** Tage von bis einschließlich datum, rückwärts n Tage: ['…-09', …, '…-15'] */
const tageBis = (datum, n) => Array.from({ length: n }, (_, i) => verschiebe(datum, i - n + 1));

/** Kennzahlen eines Zeitraums. Gezählt werden nur Tage mit Werten, leere Tage verfälschen den Schnitt sonst. */
function kennzahlenFuer(tage, { eintraege, messungen, tagSaetze }) {
  const inTagen = new Set(tage);
  const jeTag = new Map();
  for (const e of eintraege) if (inTagen.has(e.datum)) jeTag.set(e.datum, [...(jeTag.get(e.datum) ?? []), e]);
  const summen = [...jeTag.values()].map(summeEintraege);
  const art = (id) => messungen.filter((m) => m.art === id && inTagen.has(m.datum));
  const wasserJeTag = new Map();
  for (const m of art('wasser')) wasserJeTag.set(m.datum, (wasserJeTag.get(m.datum) ?? 0) + m.wert);
  return {
    tageMitEssen: jeTag.size,
    kcal: schnitt(summen.map((s) => s.kcal ?? 0)),
    protein: schnitt(summen.map((s) => s.protein ?? 0)),
    schlaf: schnitt(art('schlaf').map((m) => m.wert)),
    schritte: schnitt(art('schritte').map((m) => m.wert)),
    wasser: schnitt([...wasserJeTag.values()]),
    energie: schnitt(art('energie').map((m) => m.wert)),
    stimmung: schnitt(art('stimmung').map((m) => m.wert)),
    stress: schnitt(art('stress').map((m) => m.wert)),
    hrv: schnitt(art('hrv').map((m) => m.wert)),
    // Trainings: nur echte aus Health Connect, nicht der Plan
    trainings: (tagSaetze ?? []).filter((t) => inTagen.has(t.datum) && t.tagestypQuelle === 'healthconnect' && t.tagestyp !== 'rest').length,
  };
}

/**
 * { jetzt, davor } mit kcal, protein, schlaf, schritte, wasser (Schnitte oder null) und trainings, tageMitEssen.
 * eintraege, messungen, tagSaetze: mindestens die letzten 14 Tage.
 */
export function wochenRueckblick({ datum, eintraege = [], messungen = [], tagSaetze = [] }) {
  const jetzt = tageBis(datum, 7);
  const davor = tageBis(verschiebe(datum, -7), 7);
  return {
    von: jetzt[0],
    jetzt: kennzahlenFuer(jetzt, { eintraege, messungen, tagSaetze }),
    davor: kennzahlenFuer(davor, { eintraege, messungen, tagSaetze }),
  };
}

/** Änderung zur Vorwoche oder null, wenn eine Seite fehlt. */
export const aenderung = (jetzt, davor) => (typeof jetzt === 'number' && typeof davor === 'number' ? jetzt - davor : null);

/**
 * Ruhepuls-Trend wie beim Gewicht: Schnitt der letzten 7 Tage gegen die 7 Tage davor.
 * Erst ab je 3 Werten, sonst sagt der Schnitt nichts. { schnitt, aenderung } oder null.
 */
export function wertTrend(messungen, artId, datum) {
  const jetzt = gleitenderSchnitt(messungen, artId, datum);
  const davor = gleitenderSchnitt(messungen, artId, verschiebe(datum, -7));
  if (jetzt.anzahl < 3) return null;
  return { schnitt: jetzt.schnitt, aenderung: davor.anzahl >= 3 ? jetzt.schnitt - davor.schnitt : null };
}

export const ruhepulsTrend = (messungen, datum) => wertTrend(messungen, 'ruhepuls', datum);
