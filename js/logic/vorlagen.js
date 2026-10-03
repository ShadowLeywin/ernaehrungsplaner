// Trainings-Vorlagen (z. B. „Push 1“) mit Wochentagen; daraus werden Workouts erzeugt (reine Funktionen).
// Gespeichert unter einstellungen/vorlagen:
//  { id, name, tage: [0–6, Mo = 0], uhrzeit: '17:15' | '', notiz, uebungen: [{ uebungId, saetze, ziel, minuten, notiz }] }
import { wochentagIndex } from './ziele.js';
import { letzteLeistung } from './training.js';

export function vorlagenFuerTag(vorlagen, datum) {
  const tag = wochentagIndex(datum);
  return vorlagen
    .filter((v) => v.tage?.includes(tag))
    .sort((a, b) => (a.uhrzeit || '99').localeCompare(b.uhrzeit || '99'));
}

/** ids der Vorlagen, aus denen an diesem Tag schon ein Workout abgeschlossen wurde. */
export function erledigteVorlagen(tag) {
  return new Set((tag.trainings ?? []).filter((t) => t.vorlageId && t.ende).map((t) => t.vorlageId));
}

/** Startwert für Sekunden aus einem Ziel wie „45–60 s“ (untere Grenze). */
function ersteZahl(text) {
  const treffer = String(text ?? '').match(/\d+/);
  return treffer ? Number(treffer[0]) : undefined;
}

/**
 * Neues Workout aus einer Vorlage. Sätze werden mit den Werten vom letzten Mal vorbelegt,
 * sonst leer (Wiederholungen/Gewicht trägst du ein), Halteübungen mit der unteren Zielzeit.
 */
export function workoutAusVorlage(vorlage, alleTage, verzeichnis, { id, jetzt = new Date(), zusatz = false }) {
  return {
    id,
    typ: 'workout',
    vorlageId: vorlage.id,
    name: vorlage.name,
    start: jetzt.toISOString(),
    ende: null,
    intensitaet: 'mittel',
    zusatz,
    uebungen: vorlage.uebungen.map((v) => {
      const u = verzeichnis.get(v.uebungId);
      if (!u) return null;
      if (u.art === 'cardio' || u.art === 'dauer') {
        return { uebungId: u.id, ziel: v.ziel, notiz: v.notiz, cardio: { min: v.minuten ?? 10, km: null } };
      }
      const letzte = letzteLeistung(u.id, alleTage)?.saetze ?? [];
      const anzahl = Math.max(1, v.saetze ?? letzte.length ?? 3);
      const saetze = Array.from({ length: anzahl }, (_, i) => {
        const vorher = letzte[i] ?? letzte.at(-1);
        return {
          wdh: vorher?.wdh,
          kg: vorher?.kg ?? (u.art === 'kraft' ? undefined : 0),
          sek: u.art === 'halten' ? vorher?.sek ?? ersteZahl(v.ziel) : undefined,
          erledigt: false,
        };
      });
      return { uebungId: u.id, ziel: v.ziel, notiz: v.notiz, saetze };
    }).filter(Boolean),
  };
}
