// Trainings-Fortschritt: Verlauf je Übung, Rekorde, Volumen je Muskel, Wochenübersicht (reine Funktionen).
// Grundlage für Charakter-Werte, Erfolge und Ränge.
import { einRM, dauerMin } from './training.js';
import { datumSchluessel } from './ziele.js';

/** Abgeschlossene Workouts und Aktivitäten aller Tage, älteste zuerst: [{ datum, t }] */
export function alleTrainings(tage) {
  return tage
    .flatMap((tag) => (tag.trainings ?? [])
      .filter((t) => t.typ === 'aktivitaet' || t.ende)
      .map((t) => ({ datum: tag.datum, t })))
    .sort((a, b) => a.datum.localeCompare(b.datum) || (a.t.start ?? '').localeCompare(b.t.start ?? ''));
}

// Aufwärmsätze zählen nicht für Volumen, Rekorde und Ränge
const erledigte = (eintrag) => (eintrag.saetze ?? []).filter((s) => s.erledigt && s.typ !== 'aufwaermen');

/** Kennzahlen einer Übung innerhalb eines Workouts. kgKoerper: für Körpergewichtsübungen (Last = Körper + Zusatz). */
export function eintragsLeistung(eintrag, u, kgKoerper = 0) {
  const saetze = erledigte(eintrag);
  if (!saetze.length) return null;
  const last = (s) => (u?.art === 'koerpergewicht' ? kgKoerper + (s.kg ?? 0) : s.kg ?? 0);
  return {
    saetze: saetze.length,
    e1RM: Math.max(...saetze.map((s) => einRM(last(s), s.wdh ?? 0))),
    kg: Math.max(...saetze.map((s) => s.kg ?? 0)),
    wdh: Math.max(...saetze.map((s) => s.wdh ?? 0)),
    sek: Math.max(...saetze.map((s) => s.sek ?? 0)),
    volumen: saetze.reduce((summe, s) => summe + (s.wdh ?? 0) * last(s), 0),
  };
}

/** Verlauf einer Übung: [{ datum, e1RM, kg, wdh, sek, volumen, saetze }] je Workout, älteste zuerst. */
export function uebungsVerlauf(uebungId, tage, verzeichnis, kgKoerper = 0) {
  const u = verzeichnis.get(uebungId);
  const verlauf = [];
  for (const { datum, t } of alleTrainings(tage)) {
    if (t.typ !== 'workout') continue;
    for (const e of t.uebungen ?? []) {
      if (e.uebungId !== uebungId) continue;
      const l = eintragsLeistung(e, u, kgKoerper);
      if (l) verlauf.push({ datum, trainingId: t.id, ...l });
    }
  }
  return verlauf;
}

const KENNZAHLEN = ['e1RM', 'kg', 'wdh', 'sek', 'volumen'];

/** Rekorde je Übung: Map uebungId → { e1RM: { wert, datum }, kg, wdh, sek, volumen } */
export function rekorde(tage, verzeichnis, kgKoerper = 0, ohneTrainingId = null) {
  const ergebnis = new Map();
  for (const { datum, t } of alleTrainings(tage)) {
    if (t.typ !== 'workout' || t.id === ohneTrainingId) continue;
    for (const e of t.uebungen ?? []) {
      const l = eintragsLeistung(e, verzeichnis.get(e.uebungId), kgKoerper);
      if (!l) continue;
      const r = ergebnis.get(e.uebungId) ?? {};
      for (const k of KENNZAHLEN) {
        if (l[k] > 0 && l[k] > (r[k]?.wert ?? 0)) r[k] = { wert: l[k], datum };
      }
      ergebnis.set(e.uebungId, r);
    }
  }
  return ergebnis;
}

/**
 * Neue Bestleistungen eines Workouts gegenüber allen anderen Trainings.
 * Erste Ausführung einer Übung zählt nicht (sonst wäre jedes neue Training ein „Rekord“).
 */
export function neueRekorde(training, tage, verzeichnis, kgKoerper = 0) {
  const bisher = rekorde(tage, verzeichnis, kgKoerper, training.id);
  const neu = [];
  for (const e of training.uebungen ?? []) {
    const u = verzeichnis.get(e.uebungId);
    const l = eintragsLeistung(e, u, kgKoerper);
    const r = bisher.get(e.uebungId);
    if (!l || !r) continue;
    // Pro Übung nur die aussagekräftigste Kennzahl melden
    const reihenfolge = u?.art === 'halten' ? ['sek'] : u?.art === 'kraft' ? ['e1RM', 'kg', 'volumen'] : ['wdh', 'e1RM', 'volumen'];
    const k = reihenfolge.find((x) => l[x] > (r[x]?.wert ?? 0) + 1e-9 && r[x]);
    if (k) neu.push({ uebungId: e.uebungId, kennzahl: k, wert: l[k], vorher: r[k].wert });
  }
  return neu;
}

/** Sätze je Muskel im Zeitraum [von, bis] (Datumsschlüssel): Hauptmuskel 1, Hilfsmuskeln 0,5. */
export function volumenJeMuskel(tage, verzeichnis, von, bis) {
  const ergebnis = {};
  for (const { datum, t } of alleTrainings(tage)) {
    if (datum < von || datum > bis || t.typ !== 'workout') continue;
    for (const e of t.uebungen ?? []) {
      const u = verzeichnis.get(e.uebungId);
      const n = erledigte(e).length;
      if (!u || !n) continue;
      u.muskeln.forEach((m, i) => {
        if (m === 'ausdauer' || m === 'ganzkoerper') return;
        ergebnis[m] = (ergebnis[m] ?? 0) + n * (i === 0 ? 1 : 0.5);
      });
    }
  }
  return ergebnis;
}

export function montagVon(datum) {
  return new Date(datum.getFullYear(), datum.getMonth(), datum.getDate() - ((datum.getDay() + 6) % 7));
}

/** Übersicht der letzten `anzahl` Wochen (älteste zuerst): { montag, einheiten, saetze, volumen, minuten } */
export function wochenUebersicht(tage, verzeichnis, anzahl = 8, heute = new Date(), kgKoerper = 0) {
  const montag = montagVon(heute);
  const wochen = Array.from({ length: anzahl }, (_, i) => {
    const m = new Date(montag.getFullYear(), montag.getMonth(), montag.getDate() - (anzahl - 1 - i) * 7);
    return { montag: datumSchluessel(m), einheiten: 0, saetze: 0, volumen: 0, minuten: 0 };
  });
  for (const { datum, t } of alleTrainings(tage)) {
    const woche = [...wochen].reverse().find((w) => datum >= w.montag);
    if (!woche || datum < wochen[0].montag) continue;
    woche.einheiten += 1;
    woche.minuten += dauerMin(t);
    for (const e of t.uebungen ?? []) {
      const l = eintragsLeistung(e, verzeichnis.get(e.uebungId), kgKoerper);
      if (!l) continue;
      woche.saetze += l.saetze;
      woche.volumen += l.volumen;
    }
  }
  return wochen.map((w) => ({ ...w, volumen: Math.round(w.volumen) }));
}

/** Übungen, die schon trainiert wurden, häufigste zuerst: [{ uebungId, anzahl, zuletzt }] */
export function trainierteUebungen(tage) {
  const zaehler = new Map();
  for (const { datum, t } of alleTrainings(tage)) {
    for (const e of t.uebungen ?? []) {
      if (!erledigte(e).length && !e.cardio) continue;
      const z = zaehler.get(e.uebungId) ?? { uebungId: e.uebungId, anzahl: 0, zuletzt: datum };
      z.anzahl += 1;
      z.zuletzt = datum;
      zaehler.set(e.uebungId, z);
    }
  }
  return [...zaehler.values()].sort((a, b) => b.anzahl - a.anzahl || b.zuletzt.localeCompare(a.zuletzt));
}
