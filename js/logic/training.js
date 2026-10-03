// Training: Kalorien, Volumen, letzte Leistung, Zusatz-Training (reine Funktionen).
//
// Gespeichert im Tagesdatensatz: tag.trainings = [Training]
//  Workout:   { id, typ: 'workout', name, start, ende|null, intensitaet, zusatz, uebungen: [Eintrag] }
//             Eintrag: { uebungId, saetze: [{ wdh, kg, sek, erledigt }] }  (Kraft/Körpergewicht/Halten)
//                      { uebungId, cardio: { min, km } }                    (Cardio innerhalb eines Workouts)
//  Aktivität: { id, typ: 'aktivitaet', uebungId, start, dauerMin, km, intensitaet, zusatz }
//
// zusatz = true: ungeplantes Training, erhöht das Tagesziel (Hybrid-Regel). Geplantes Training steckt im Tagestyp.
import { EINHEIT_MET } from '../daten/uebungen.js';
import { skaliereMakros } from './ziele.js';

export function uebungsVerzeichnis(uebungen) {
  return new Map(uebungen.map((u) => [u.id, u]));
}

/** kcal über dem Ruheumsatz: (MET − 1) × kg × Stunden. Grundumsatz ist im Tagesbedarf schon enthalten. */
export function nettoKcal(met, gewichtKg, minuten) {
  return Math.max(0, (met - 1) * gewichtKg * (minuten / 60));
}

export function dauerMin(training, jetzt = new Date()) {
  if (training.typ === 'aktivitaet') return training.dauerMin ?? 0;
  if (training.dauerMin != null) return training.dauerMin;
  const ende = training.ende ? new Date(training.ende) : jetzt;
  return Math.max(0, Math.round((ende - new Date(training.start)) / 60000));
}

/** Überwiegend Calisthenics oder Gym? Bestimmt den MET-Wert der Kraft-Einheit. */
export function einheitsArt(training, verzeichnis) {
  const kategorien = training.uebungen
    .map((e) => verzeichnis.get(e.uebungId)?.kategorie)
    .filter((k) => k === 'gym' || k === 'calisthenics');
  const cali = kategorien.filter((k) => k === 'calisthenics').length;
  return cali > kategorien.length / 2 ? 'calisthenics' : 'gym';
}

export function kcalTraining(training, verzeichnis, gewichtKg, jetzt = new Date()) {
  const intensitaet = training.intensitaet ?? 'mittel';
  if (training.typ === 'aktivitaet') {
    const met = verzeichnis.get(training.uebungId)?.met?.[intensitaet] ?? 4;
    return nettoKcal(met, gewichtKg, training.dauerMin ?? 0);
  }
  // Cardio-Teile im Workout mit eigenem MET, Rest der Zeit als Kraft-Einheit
  let cardioMin = 0;
  let kcal = 0;
  for (const e of training.uebungen) {
    if (!e.cardio) continue;
    const met = verzeichnis.get(e.uebungId)?.met?.[intensitaet] ?? 6;
    cardioMin += e.cardio.min ?? 0;
    kcal += nettoKcal(met, gewichtKg, e.cardio.min ?? 0);
  }
  const kraftMin = Math.max(0, dauerMin(training, jetzt) - cardioMin);
  const met = EINHEIT_MET[einheitsArt(training, verzeichnis)][intensitaet];
  return kcal + nettoKcal(met, gewichtKg, kraftMin);
}

/** Erledigte Sätze, Wiederholungen und bewegtes Gewicht (Wdh × kg). */
export function statistik(training) {
  let saetze = 0;
  let wdh = 0;
  let volumen = 0;
  for (const e of training.uebungen ?? []) {
    for (const s of e.saetze ?? []) {
      if (!s.erledigt) continue;
      saetze += 1;
      wdh += s.wdh ?? 0;
      volumen += (s.wdh ?? 0) * (s.kg ?? 0);
    }
  }
  return { saetze, wdh, volumen: Math.round(volumen) };
}

/**
 * Letzte erledigte Sätze einer Übung vor dem aktuellen Training.
 * tage: Tagesdatensätze (beliebige Reihenfolge). Liefert { datum, saetze } oder null.
 */
export function letzteLeistung(uebungId, tage, aktuelleTrainingId = null) {
  const sortiert = [...tage].sort((a, b) => b.datum.localeCompare(a.datum));
  for (const tag of sortiert) {
    const trainings = [...(tag.trainings ?? [])].sort((a, b) => (b.start ?? '').localeCompare(a.start ?? ''));
    for (const t of trainings) {
      if (t.id === aktuelleTrainingId || t.typ !== 'workout') continue;
      const eintrag = t.uebungen.find((e) => e.uebungId === uebungId);
      const saetze = eintrag?.saetze?.filter((s) => s.erledigt) ?? [];
      if (saetze.length) return { datum: tag.datum, saetze };
    }
  }
  return null;
}

/** „3 × 8 · 60 kg“ bzw. „8, 8, 6 Wdh“ / „30, 25 s“ – kompakte Beschreibung von Sätzen. */
export function saetzeText(saetze, art) {
  if (!saetze?.length) return '';
  if (art === 'halten') return `${saetze.map((s) => s.sek ?? 0).join(', ')} s`;
  const alleGleich = saetze.every((s) => s.wdh === saetze[0].wdh && (s.kg ?? 0) === (saetze[0].kg ?? 0));
  const kg = (s) => (s.kg ? ` · ${String(s.kg).replace('.', ',')} kg` : '');
  if (alleGleich) return `${saetze.length} × ${saetze[0].wdh}${kg(saetze[0])}`;
  return saetze.map((s) => `${s.wdh}${s.kg ? `×${String(s.kg).replace('.', ',')}` : ''}`).join(', ') + (art === 'kraft' ? ' kg' : ' Wdh');
}

/** Geschätztes 1-Wiederholungs-Maximum nach Epley. */
export function einRM(kg, wdh) {
  if (!kg || !wdh) return 0;
  return wdh === 1 ? kg : kg * (1 + wdh / 30);
}

/** kcal aus Zusatz-Training eines Tages (nur abgeschlossene Workouts und Aktivitäten). */
export function zusatzKcal(tag, verzeichnis, gewichtKg) {
  return (tag.trainings ?? [])
    .filter((t) => t.zusatz && (t.typ === 'aktivitaet' || t.ende))
    .reduce((summe, t) => summe + kcalTraining(t, verzeichnis, gewichtKg), 0);
}

/** Tagesziel inklusive Zusatz-Training (auf 25 kcal gerundet); Protein bleibt, KH/Fett im Verhältnis. */
export function zielMitZusatz(typ, zusatz) {
  const extra = Math.round(zusatz / 25) * 25;
  if (extra <= 0) return { ...typ, extraKcal: 0 };
  const kcal = typ.kcal + extra;
  return { ...typ, kcal, ...skaliereMakros(typ, kcal), extraKcal: extra };
}
