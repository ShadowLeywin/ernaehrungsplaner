// Health-Werte: Arten von Messungen, Prüfung, 7-Tage-Schnitt, Vergleich mit dem Wochenziel. Reine Funktionen.
// Eine Messung ist { id, datum, art, wert }. Die Zahlen im Code sind neutrale Startwerte, keine Empfehlungen.

import { verschiebe } from './datum.js';
import { parseZahl } from './zutat.js';

/** proTag: 'einmal' = ein Wert je Tag (neuer ersetzt alten), 'summe' = mehrere Einträge werden addiert */
export const ARTEN = [
  { id: 'gewicht', name: 'Gewicht', einheit: 'kg', min: 20, max: 400, stellen: 1, proTag: 'einmal' },
  { id: 'wasser', name: 'Wasser', einheit: 'ml', min: 1, max: 5000, stellen: 0, proTag: 'summe' },
  { id: 'schlaf', name: 'Schlaf', einheit: 'h', min: 0, max: 24, stellen: 1, proTag: 'einmal' },
  { id: 'schritte', name: 'Schritte', einheit: '', min: 0, max: 200000, stellen: 0, proTag: 'einmal' },
  // Körperwerte (meist aus Health Connect, auch von Hand)
  { id: 'ruhepuls', name: 'Ruhepuls', einheit: 'bpm', min: 25, max: 150, stellen: 0, proTag: 'einmal', gruppe: 'koerper' },
  { id: 'koerperfett', name: 'Körperfett', einheit: '%', min: 2, max: 70, stellen: 1, proTag: 'einmal', gruppe: 'koerper' },
  // Körpermaße. Reihenfolge = Reihenfolge der Kacheln: Paare links/rechts stehen nebeneinander.
  { id: 'mass:hals', name: 'Hals', einheit: 'cm', min: 20, max: 80, stellen: 1, proTag: 'einmal', gruppe: 'mass' },
  { id: 'mass:schultern', name: 'Schultern', einheit: 'cm', min: 60, max: 220, stellen: 1, proTag: 'einmal', gruppe: 'mass' },
  { id: 'mass:brust', name: 'Brust', einheit: 'cm', min: 40, max: 250, stellen: 1, proTag: 'einmal', gruppe: 'mass' },
  { id: 'mass:taille', name: 'Taille', einheit: 'cm', min: 30, max: 250, stellen: 1, proTag: 'einmal', gruppe: 'mass' },
  { id: 'mass:bauch', name: 'Bauch', einheit: 'cm', min: 30, max: 250, stellen: 1, proTag: 'einmal', gruppe: 'mass' },
  { id: 'mass:huefte', name: 'Hüfte', einheit: 'cm', min: 40, max: 250, stellen: 1, proTag: 'einmal', gruppe: 'mass' },
  { id: 'mass:oberarm-links', name: 'Oberarm links', einheit: 'cm', min: 10, max: 80, stellen: 1, proTag: 'einmal', gruppe: 'mass' },
  { id: 'mass:oberarm-rechts', name: 'Oberarm rechts', einheit: 'cm', min: 10, max: 80, stellen: 1, proTag: 'einmal', gruppe: 'mass' },
  { id: 'mass:unterarm-links', name: 'Unterarm links', einheit: 'cm', min: 10, max: 70, stellen: 1, proTag: 'einmal', gruppe: 'mass' },
  { id: 'mass:unterarm-rechts', name: 'Unterarm rechts', einheit: 'cm', min: 10, max: 70, stellen: 1, proTag: 'einmal', gruppe: 'mass' },
  { id: 'mass:handgelenk-links', name: 'Handgelenk links', einheit: 'cm', min: 8, max: 40, stellen: 1, proTag: 'einmal', gruppe: 'mass' },
  { id: 'mass:handgelenk-rechts', name: 'Handgelenk rechts', einheit: 'cm', min: 8, max: 40, stellen: 1, proTag: 'einmal', gruppe: 'mass' },
  { id: 'mass:oberschenkel-links', name: 'Oberschenkel links', einheit: 'cm', min: 20, max: 120, stellen: 1, proTag: 'einmal', gruppe: 'mass' },
  { id: 'mass:oberschenkel-rechts', name: 'Oberschenkel rechts', einheit: 'cm', min: 20, max: 120, stellen: 1, proTag: 'einmal', gruppe: 'mass' },
  { id: 'mass:wade-links', name: 'Wade links', einheit: 'cm', min: 15, max: 80, stellen: 1, proTag: 'einmal', gruppe: 'mass' },
  { id: 'mass:wade-rechts', name: 'Wade rechts', einheit: 'cm', min: 15, max: 80, stellen: 1, proTag: 'einmal', gruppe: 'mass' },
  { id: 'mass:gesaess', name: 'Gesäß', einheit: 'cm', min: 40, max: 250, stellen: 1, proTag: 'einmal', gruppe: 'mass' },
  { id: 'mass:eigen1', name: 'Eigenes Maß 1', einheit: 'cm', min: 1, max: 300, stellen: 1, proTag: 'einmal', gruppe: 'mass', eigen: true },
  { id: 'mass:eigen2', name: 'Eigenes Maß 2', einheit: 'cm', min: 1, max: 300, stellen: 1, proTag: 'einmal', gruppe: 'mass', eigen: true },
  // Aus Version 1.0 ohne Seite; erscheinen nur, wenn es Werte gibt (keine Daten umdeuten)
  { id: 'mass:oberarm', name: 'Oberarm (ohne Seite)', einheit: 'cm', min: 5, max: 150, stellen: 1, proTag: 'einmal', gruppe: 'mass', alt: true },
  { id: 'mass:oberschenkel', name: 'Oberschenkel (ohne Seite)', einheit: 'cm', min: 10, max: 200, stellen: 1, proTag: 'einmal', gruppe: 'mass', alt: true },
];

export const artVon = (id) => ARTEN.find((a) => a.id === id);

/** Wählbare Maße (ohne die alten ohne Seite). */
export const WAEHLBARE_MASSE = ARTEN.filter((a) => a.gruppe === 'mass' && !a.alt).map((a) => a.id);

/** Gespeicherte Auswahl der Maß-Kacheln prüfen: nur bekannte, feste Reihenfolge; nichts Gültiges gespeichert: alle. */
export function bereinigeMasseAuswahl(roh) {
  if (!Array.isArray(roh)) return [...WAEHLBARE_MASSE];
  return WAEHLBARE_MASSE.filter((id) => roh.includes(id));
}

/** Maße für die Kacheln: gewählte Maße; alte Arten ohne Seite nur, wenn es von ihnen Werte gibt. */
export function sichtbareMasse(messungen, auswahl = WAEHLBARE_MASSE) {
  const mitWerten = new Set(messungen.map((m) => m.art));
  return ARTEN.filter((a) => a.gruppe === 'mass' && (a.alt ? mitWerten.has(a.id) : auswahl.includes(a.id)));
}

/** Letzter Wert und Änderung zum vorletzten: { wert, datum, aenderung } oder null. Für die Maß-Kacheln. */
export function standUndAenderung(messungen, artId, datum) {
  const werte = messungen.filter((m) => m.art === artId && m.datum <= datum).sort((a, b) => b.datum.localeCompare(a.datum));
  if (!werte.length) return null;
  return { wert: werte[0].wert, datum: werte[0].datum, aenderung: werte.length > 1 ? werte[0].wert - werte[1].wert : null };
}

/* ---------- Wasser-Knöpfe: drei eigene Mengen ---------- */

export const STANDARD_WASSER_MENGEN = [250, 500, 750];
const WASSER_MENGE = [10, 2000];

/** Gespeicherte Mengen prüfen: genau drei ganze Zahlen von 10 bis 2.000 ml, sonst die Startwerte. */
export function bereinigeWasserMengen(roh) {
  const gueltig = Array.isArray(roh) && roh.length === 3
    && roh.every((m) => Number.isInteger(m) && m >= WASSER_MENGE[0] && m <= WASSER_MENGE[1]);
  return gueltig ? [...roh] : [...STANDARD_WASSER_MENGEN];
}

/** Eingabe aus den Einstellungen: ['200', '330', '1000'] → { ok, fehler: [text|null ×3], mengen } */
export function pruefeWasserMengen(eingabe) {
  const fehler = [0, 1, 2].map((i) => {
    const wert = parseZahl(eingabe?.[i]);
    return wert === null || Number.isNaN(wert) || !Number.isInteger(wert) || wert < WASSER_MENGE[0] || wert > WASSER_MENGE[1]
      ? 'Ganze Zahl von 10 bis 2.000 ml.' : null;
  });
  const ok = fehler.every((f) => f === null);
  return { ok, fehler, mengen: ok ? [0, 1, 2].map((i) => parseZahl(eingabe[i])) : null };
}

export const STANDARD_GESUNDHEIT = { wochenzielKg: 0, wasserZielMl: 2500, schlafZielH: 8, schritteZiel: 8000 };

const ZIEL_GRENZEN = { wochenzielKg: [-2, 2], wasserZielMl: [250, 10000], schlafZielH: [1, 16], schritteZiel: [0, 100000] };

/** Gespeicherte Health-Ziele mit Startwerten auffüllen */
export function bereinigeGesundheit(roh) {
  const ziele = {};
  for (const [id, [min, max]] of Object.entries(ZIEL_GRENZEN)) {
    const wert = roh?.[id];
    ziele[id] = typeof wert === 'number' && Number.isFinite(wert) && wert >= min && wert <= max ? wert : STANDARD_GESUNDHEIT[id];
  }
  return ziele;
}

/** Eingabe der Health-Ziele prüfen: { wochenzielKg: '0,25', … } → { ok, fehler: { id: text }, ziele } */
export function pruefeGesundheit(eingabe) {
  const fehler = {};
  const ziele = {};
  for (const [id, [min, max]] of Object.entries(ZIEL_GRENZEN)) {
    const wert = parseZahl(eingabe?.[id]);
    if (wert === null || Number.isNaN(wert) || wert < min || wert > max) fehler[id] = `Zahl von ${String(min).replace('.', ',')} bis ${max.toLocaleString('de-DE')}.`;
    else ziele[id] = wert;
  }
  const ok = Object.keys(fehler).length === 0;
  return { ok, fehler, ziele: ok ? ziele : null };
}

/** Einen Messwert aus einem Textfeld prüfen. Liefert { ok, wert } oder { ok: false, fehler }. */
export function pruefeMesswert(artId, text) {
  const art = artVon(artId);
  const wert = parseZahl(text);
  if (wert === null) return { ok: false, fehler: 'Bitte eine Zahl eintragen.' };
  if (Number.isNaN(wert) || wert < art.min || wert > art.max) {
    return { ok: false, fehler: `${art.name}: Zahl von ${art.min.toLocaleString('de-DE')} bis ${art.max.toLocaleString('de-DE')}${art.einheit ? ` ${art.einheit}` : ''}.` };
  }
  return { ok: true, wert };
}

/** Kennung einer Messung: bei einem Wert je Tag überschreibt die nächste Eingabe die alte. */
export const messungId = (artId, datum, zufall) => (artVon(artId).proTag === 'einmal' ? `${artId}|${datum}` : `${artId}|${datum}|${zufall}`);

/** Summe aller Messungen einer Art an einem Tag (z. B. Wasser) */
export const tagesSumme = (messungen, artId, datum) => messungen
  .filter((m) => m.art === artId && m.datum === datum)
  .reduce((s, m) => s + m.wert, 0);

/** Wert einer Art an einem Tag oder null */
export const tagesWert = (messungen, artId, datum) => messungen.find((m) => m.art === artId && m.datum === datum)?.wert ?? null;

/** Letzter Wert einer Art bis einschließlich datum: { datum, wert } oder null */
export function letzterWert(messungen, artId, datum) {
  return messungen
    .filter((m) => m.art === artId && m.datum <= datum)
    .sort((a, b) => b.datum.localeCompare(a.datum))[0] ?? null;
}

/**
 * Schnitt der Werte in den tage Tagen bis einschließlich datum.
 * Das Gewicht schwankt von Tag zu Tag um ein Kilo und mehr (Wasser, Salz, Darminhalt);
 * erst der Schnitt über eine Woche zeigt die Richtung.
 */
export function gleitenderSchnitt(messungen, artId, datum, tage = 7) {
  const von = verschiebe(datum, -(tage - 1));
  const werte = messungen.filter((m) => m.art === artId && m.datum >= von && m.datum <= datum).map((m) => m.wert);
  if (!werte.length) return { schnitt: null, anzahl: 0 };
  return { schnitt: werte.reduce((a, b) => a + b, 0) / werte.length, anzahl: werte.length };
}

export const MIN_WERTE_JE_WOCHE = 3;

/**
 * Gewichts-Trend: Schnitt der letzten 7 Tage gegen den Schnitt der 7 Tage davor, verglichen mit dem Wochenziel.
 * status: 'zuWenigDaten' | 'imZiel' | 'darunter' | 'darueber'. Toleranz ±0,1 kg je Woche.
 */
export function gewichtsTrend(messungen, datum, wochenzielKg = 0) {
  const jetzt = gleitenderSchnitt(messungen, 'gewicht', datum);
  const davor = gleitenderSchnitt(messungen, 'gewicht', verschiebe(datum, -7));
  if (jetzt.anzahl < MIN_WERTE_JE_WOCHE || davor.anzahl < MIN_WERTE_JE_WOCHE) {
    return { status: 'zuWenigDaten', schnitt: jetzt.schnitt, anzahl: jetzt.anzahl, anzahlDavor: davor.anzahl, aenderung: null };
  }
  const aenderung = jetzt.schnitt - davor.schnitt;
  const abweichung = aenderung - wochenzielKg;
  let status = 'imZiel';
  if (abweichung > 0.1) status = 'darueber';
  else if (abweichung < -0.1) status = 'darunter';
  return { status, schnitt: jetzt.schnitt, anzahl: jetzt.anzahl, anzahlDavor: davor.anzahl, aenderung, abweichung };
}

/**
 * Richtung einer Änderung für einen Pfeil: 'hoch', 'runter' oder 'gleich'.
 * Unter 0,05 kg gilt als gleich, damit Rundungsrauschen keinen Pfeil erzeugt.
 */
export function trendRichtung(aenderung, schwelle = 0.05) {
  if (typeof aenderung !== 'number' || !Number.isFinite(aenderung) || Math.abs(aenderung) < schwelle) return 'gleich';
  return aenderung > 0 ? 'hoch' : 'runter';
}

/** Werte einer Art der letzten tage Tage, alt nach neu: [{ datum, wert }] */
export function verlauf(messungen, artId, datum, tage = 30) {
  const von = verschiebe(datum, -(tage - 1));
  return messungen
    .filter((m) => m.art === artId && m.datum >= von && m.datum <= datum)
    .sort((a, b) => a.datum.localeCompare(b.datum))
    .map((m) => ({ datum: m.datum, wert: m.wert }));
}

/**
 * Verlauf einer Art als Reihe je Tag. Bei Arten, die sich am Tag summieren (Wasser), wird je Tag addiert.
 * Liefert [{ datum, wert }] alt nach neu, nur Tage mit Werten.
 */
export function verlaufJeTag(messungen, artId, datum, tage = 30) {
  if (artVon(artId).proTag !== 'summe') return verlauf(messungen, artId, datum, tage);
  const von = verschiebe(datum, -(tage - 1));
  const summen = new Map();
  for (const m of messungen) {
    if (m.art !== artId || m.datum < von || m.datum > datum) continue;
    summen.set(m.datum, (summen.get(m.datum) ?? 0) + m.wert);
  }
  return [...summen.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([d, wert]) => ({ datum: d, wert }));
}

/** Punkte für eine kleine Verlaufslinie: "x,y x,y …" in einem Feld von breite × hoehe. */
export function linienPunkte(werte, breite, hoehe, rand = 4) {
  if (werte.length < 2) return '';
  const min = Math.min(...werte);
  const max = Math.max(...werte);
  const spanne = max - min || 1;
  return werte.map((w, i) => {
    const x = rand + (i * (breite - 2 * rand)) / (werte.length - 1);
    const y = hoehe - rand - ((w - min) * (hoehe - 2 * rand)) / spanne;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}
