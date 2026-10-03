// Gewicht: Verlauf, gleitender 7-Tage-Durchschnitt, tatsächliche Rate und Kalorien-Anpassung (reine Funktionen).
// Gewicht wird pro Tag im Tagesdatensatz gespeichert: tag.gewichtKg
import { KCAL_PRO_KG } from './bedarf.js';
import { skaliereMakros } from './ziele.js';

const TAG_MS = 24 * 60 * 60 * 1000;
const alsDatum = (schluessel) => new Date(`${schluessel}T12:00:00`);
const tageZwischen = (a, b) => Math.round((alsDatum(b) - alsDatum(a)) / TAG_MS);

export const MIN_MESSUNGEN_PRO_WOCHE = 3;
export const MAX_ANPASSUNG_KCAL = 150;
export const DAEMPFUNG = 0.5; // nur die Hälfte der rechnerischen Lücke korrigieren – Gewicht schwankt stark

/** Sortierte Messreihe [{ datum, kg }] aus Tagesdatensätzen. */
export function gewichtsReihe(tage) {
  return tage
    .filter((t) => t.gewichtKg > 0)
    .map((t) => ({ datum: t.datum, kg: t.gewichtKg }))
    .sort((a, b) => a.datum.localeCompare(b.datum));
}

/** Durchschnitt der Messungen im Fenster (bisDatum - tage + 1 … bisDatum); null bei zu wenigen Messungen. */
export function durchschnitt(reihe, bisDatum, tage = 7, minMessungen = MIN_MESSUNGEN_PRO_WOCHE) {
  const imFenster = reihe.filter((m) => {
    const abstand = tageZwischen(m.datum, bisDatum);
    return abstand >= 0 && abstand < tage;
  });
  if (imFenster.length < minMessungen) return null;
  return imFenster.reduce((s, m) => s + m.kg, 0) / imFenster.length;
}

/** Gleitender 7-Tage-Durchschnitt für jede Messung (für das Diagramm). */
export function gleitenderDurchschnitt(reihe) {
  return reihe.map((m) => ({ datum: m.datum, kg: durchschnitt(reihe, m.datum, 7, 1) }));
}

/** Tatsächliche Änderung in kg/Woche: letzte 7 Tage gegen die 7 Tage davor. null, wenn zu wenig Daten. */
export function tatsaechlicheRate(reihe, heute) {
  const aktuell = durchschnitt(reihe, heute);
  const vorwocheEnde = new Date(alsDatum(heute).getTime() - 7 * TAG_MS);
  const vorwocheSchluessel = vorwocheEnde.toISOString().slice(0, 10);
  const vorwoche = durchschnitt(reihe, vorwocheSchluessel);
  if (aktuell == null || vorwoche == null) return null;
  return { aktuell, vorwoche, rate: aktuell - vorwoche };
}

/** Geplante Rate mit Vorzeichen (Aufbau +, Abnehmen −, Halten 0). */
export function zielRate(ziel) {
  if (!ziel || ziel.art === 'halten') return 0;
  return ziel.art === 'abnehmen' ? -ziel.kgProWoche : ziel.kgProWoche;
}

/**
 * Wöchentlicher Anpassungsvorschlag.
 * Liefert { status, kcalProTag?, rate?, soll? }:
 *  'zu_wenig_daten' – weniger als 2 Wochen mit je ≥ 3 Messungen
 *  'warten'         – letzte Entscheidung weniger als 7 Tage her
 *  'im_plan'        – Abweichung zu klein für eine Anpassung (< 50 kcal)
 *  'anpassen'       – kcalProTag (±25er-Schritte, max. ±150)
 */
export function anpassungsVorschlag(reihe, ziel, heute, letzteEntscheidung = null) {
  const soll = zielRate(ziel);
  if (!reihe.length || tageZwischen(reihe[0].datum, heute) < 13) return { status: 'zu_wenig_daten', soll };
  const gemessen = tatsaechlicheRate(reihe, heute);
  if (!gemessen) return { status: 'zu_wenig_daten', soll };
  if (letzteEntscheidung && tageZwischen(letzteEntscheidung, heute) < 7) {
    return { status: 'warten', soll, rate: gemessen.rate, ...gemessen };
  }
  const roh = ((soll - gemessen.rate) * KCAL_PRO_KG / 7) * DAEMPFUNG;
  const begrenzt = Math.max(-MAX_ANPASSUNG_KCAL, Math.min(MAX_ANPASSUNG_KCAL, roh));
  const kcalProTag = Math.round(begrenzt / 25) * 25;
  if (Math.abs(kcalProTag) < 50) return { status: 'im_plan', soll, ...gemessen };
  return { status: 'anpassen', kcalProTag, soll, ...gemessen };
}

/** Anpassung auf alle Tagestypen anwenden: kcal ± delta, Protein bleibt, KH/Fett im bisherigen Verhältnis. */
export function wendeAnpassungAn(profil, kcalProTag) {
  for (const typ of profil.tagestypen) {
    const kcal = typ.kcal + kcalProTag;
    Object.assign(typ, { kcal }, skaliereMakros(typ, kcal));
  }
  return profil;
}
