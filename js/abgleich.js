// Abgleich mit Health Connect: lesen (plattform.js), umrechnen (logik/healthconnect.js), speichern (speicher.js).
// Eigene Eingaben bleiben unangetastet; gespeichert wird nur, was neu ist oder sich geändert hat.

import { isoDatum, verschiebe, ausIso } from './logik/datum.js';
import { darfTagestypSetzen, gewichtJeTag, koerperfettJeTag, ruhepulsJeTag, schlafJeNacht, schritteJeTag, tagestypJeTag, zuUebernehmen } from './logik/healthconnect.js';
import { hcLesen, istApp } from './plattform.js';
import * as speicher from './speicher.js';

const SCHLUESSEL_AUTO = 'elan.hc.automatisch';
const SCHLUESSEL_ZULETZT = 'elan.hc.zuletzt';

export function automatischAn() {
  try { return localStorage.getItem(SCHLUESSEL_AUTO) === 'an'; } catch { return false; }
}
export function setzeAutomatisch(an) {
  try { localStorage.setItem(SCHLUESSEL_AUTO, an ? 'an' : 'aus'); } catch { /* nur bis zum Neuladen */ }
}
export function zuletztAbgeglichen() {
  try { return localStorage.getItem(SCHLUESSEL_ZULETZT); } catch { return null; }
}

/** Liest die letzten tage Tage und speichert, was fehlt. Liefert die Zahl der gespeicherten Werte. */
export async function gleicheAb(tage = 30) {
  if (!istApp()) return 0;
  const heute = isoDatum();
  const von = verschiebe(heute, -(tage - 1));
  const start = ausIso(von);
  start.setHours(0, 0, 0, 0); // ab Mitternacht des ersten Tages
  const roh = await hcLesen(start.toISOString(), new Date().toISOString());
  const gelesen = [...schritteJeTag(roh.steps), ...gewichtJeTag(roh.weight), ...schlafJeNacht(roh.sleep), ...ruhepulsJeTag(roh.restingHeartRate), ...koerperfettJeTag(roh.bodyFat)]
    .filter((m) => m.datum >= von && m.datum <= heute);
  const vorhanden = await speicher.messungenZwischen(von, heute);
  const neu = zuUebernehmen(vorhanden, gelesen);
  for (const m of neu) await speicher.speichereMessung(m);
  // Tagestyp aus Trainings, nur an Tagen ohne eigene Wahl
  let tagestypen = 0;
  for (const { datum, tagestyp } of tagestypJeTag(roh.workouts).filter((t) => t.datum >= von && t.datum <= heute)) {
    const tag = await speicher.holeTag(datum);
    if (!darfTagestypSetzen(tag) || tag?.tagestyp === tagestyp) continue;
    await speicher.setzeTagestypAusTraining(datum, tagestyp);
    tagestypen += 1;
  }
  try { localStorage.setItem(SCHLUESSEL_ZULETZT, new Date().toISOString()); } catch { /* egal */ }
  return neu.length + tagestypen;
}
