// Laborwerte und Symptome: Prüfung, Einordnung gegen den Referenzbereich, Zählung von Mahlzeiten vor Symptomen.
// Reine Funktionen. Die App deutet nichts medizinisch: Sie zeigt nur, was eingetragen wurde.

import { istGueltig } from './datum.js';
import { parseZahl } from './zutat.js';

/* ---------- Laborwerte ---------- */

/** Liegt der Wert im eingetragenen Bereich? 'ohne', wenn keine Grenze eingetragen ist. */
export function laborStatus({ wert, refMin, refMax }) {
  const hatMin = typeof refMin === 'number';
  const hatMax = typeof refMax === 'number';
  if (!hatMin && !hatMax) return 'ohne';
  if (hatMin && wert < refMin) return 'unter';
  if (hatMax && wert > refMax) return 'ueber';
  return 'im';
}

/** Referenzbereich als Text: "3,5 bis 5", "ab 3,5", "bis 5" oder leer */
export function bereichText({ refMin, refMax, einheit = '' }) {
  const z = (n) => n.toLocaleString('de-DE', { maximumFractionDigits: 3 });
  const e = einheit ? ` ${einheit}` : '';
  if (typeof refMin === 'number' && typeof refMax === 'number') return `${z(refMin)} bis ${z(refMax)}${e}`;
  if (typeof refMin === 'number') return `ab ${z(refMin)}${e}`;
  if (typeof refMax === 'number') return `bis ${z(refMax)}${e}`;
  return '';
}

/**
 * Eingabe eines Laborwerts prüfen: { name, wert, einheit, refMin, refMax, datum, notiz }.
 * Der Referenzbereich steht auf dem Laborbericht und unterscheidet sich je Labor; deshalb wird er je Wert gespeichert.
 */
export function pruefeLaborwert(eingabe) {
  const fehler = {};
  const name = String(eingabe.name ?? '').trim();
  if (!name) fehler.name = 'Wie heißt der Wert?';
  else if (name.length > 60) fehler.name = 'Höchstens 60 Zeichen.';
  const wert = parseZahl(eingabe.wert);
  if (wert === null || Number.isNaN(wert)) fehler.wert = 'Bitte eine Zahl eintragen.';
  const grenze = (id) => {
    const zahl = parseZahl(eingabe[id]);
    if (zahl === null) return undefined;
    if (Number.isNaN(zahl)) { fehler[id] = 'Zahl oder leer lassen.'; return undefined; }
    return zahl;
  };
  const refMin = grenze('refMin');
  const refMax = grenze('refMax');
  if (refMin !== undefined && refMax !== undefined && refMin > refMax) fehler.refMax = 'Die obere Grenze liegt unter der unteren.';
  if (!istGueltig(eingabe.datum)) fehler.datum = 'Wähle ein Datum.';
  const ok = Object.keys(fehler).length === 0;
  if (!ok) return { ok, fehler, laborwert: null };
  const laborwert = { name, wert, einheit: String(eingabe.einheit ?? '').trim().slice(0, 20), datum: eingabe.datum };
  if (refMin !== undefined) laborwert.refMin = refMin;
  if (refMax !== undefined) laborwert.refMax = refMax;
  const notiz = String(eingabe.notiz ?? '').trim().slice(0, 200);
  if (notiz) laborwert.notiz = notiz;
  return { ok, fehler, laborwert };
}

/** Werte nach Name gruppieren, je Gruppe neueste zuerst; Gruppen alphabetisch. */
export function laborGruppen(werte) {
  const gruppen = new Map();
  for (const w of werte) {
    if (!gruppen.has(w.name)) gruppen.set(w.name, []);
    gruppen.get(w.name).push(w);
  }
  return [...gruppen.entries()]
    .map(([name, liste]) => ({ name, werte: liste.sort((a, b) => b.datum.localeCompare(a.datum)) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

/* ---------- Symptome ---------- */

export const STAERKEN = [1, 2, 3, 4, 5];

/** Eingabe eines Symptoms prüfen: { art, staerke, datum, zeit, notiz, eintragIds } */
export function pruefeSymptom(eingabe) {
  const fehler = {};
  const art = String(eingabe.art ?? '').trim();
  if (!art) fehler.art = 'Was hast du bemerkt?';
  else if (art.length > 60) fehler.art = 'Höchstens 60 Zeichen.';
  const staerke = Number(eingabe.staerke);
  if (!STAERKEN.includes(staerke)) fehler.staerke = 'Wähle eine Stärke von 1 bis 5.';
  if (!istGueltig(eingabe.datum)) fehler.datum = 'Wähle ein Datum.';
  const zeit = String(eingabe.zeit ?? '').trim();
  if (zeit && !/^([01]\d|2[0-3]):[0-5]\d$/.test(zeit)) fehler.zeit = 'Uhrzeit als Stunde:Minute.';
  const ok = Object.keys(fehler).length === 0;
  if (!ok) return { ok, fehler, symptom: null };
  const symptom = { art, staerke, datum: eingabe.datum, eintragIds: [...new Set(eingabe.eintragIds ?? [])] };
  if (zeit) symptom.zeit = zeit;
  const notiz = String(eingabe.notiz ?? '').trim().slice(0, 300);
  if (notiz) symptom.notiz = notiz;
  return { ok, fehler, symptom };
}

/**
 * Was stand wie oft vor einem Symptom auf dem Teller?
 * Zählt je Lebensmittel (Name des Eintrags), bei wie vielen Symptomen es zugeordnet war und an wie vielen Tagen
 * es insgesamt gegessen wurde. Das ist eine Zählung, kein Nachweis: Was man täglich isst, steht immer oben.
 * Liefert [{ name, beiSymptomen, tageGegessen }] sortiert nach beiSymptomen, ab mindestens `ab` Treffern.
 */
export function vorSymptomen(symptome, eintraege, ab = 2) {
  const nachId = new Map(eintraege.map((e) => [e.id, e]));
  const treffer = new Map();
  for (const s of symptome) {
    const namen = new Set((s.eintragIds ?? []).map((id) => nachId.get(id)?.name).filter(Boolean));
    for (const name of namen) treffer.set(name, (treffer.get(name) ?? 0) + 1);
  }
  const tage = new Map();
  for (const e of eintraege) {
    if (!tage.has(e.name)) tage.set(e.name, new Set());
    tage.get(e.name).add(e.datum);
  }
  return [...treffer.entries()]
    .filter(([, n]) => n >= ab)
    .map(([name, beiSymptomen]) => ({ name, beiSymptomen, tageGegessen: tage.get(name)?.size ?? 0 }))
    .sort((a, b) => b.beiSymptomen - a.beiSymptomen || a.name.localeCompare(b.name, 'de'));
}
