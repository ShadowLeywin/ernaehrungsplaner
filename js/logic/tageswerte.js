// Kennzahlen eines einzelnen Tages – Grundlage für Aufträge, Boss und Wirtschaft (reine Funktionen).
import { tagesNaehrwerte, gemueseObstGramm } from './tag.js';
import { tagestypFuerDatum } from './ziele.js';
import { wasserBisUhrzeit } from './wasser.js';
import { statistik, dauerMin } from './training.js';

export function tagesKennzahlen(tag, { profil, lebensmittel }) {
  const fertig = (tag.trainings ?? []).filter((t) => t.typ === 'aktivitaet' || t.ende);
  const workouts = fertig.filter((t) => t.typ === 'workout');
  let saetze = 0;
  let volumenKg = 0;
  for (const w of workouts) {
    const st = statistik(w);
    saetze += st.saetze;
    volumenKg += st.volumen;
  }
  const ausdauerMin = fertig.filter((t) => t.typ === 'aktivitaet').reduce((s, t) => s + dauerMin(t), 0)
    + workouts.flatMap((w) => w.uebungen ?? []).reduce((s, e) => s + (e.cardio?.min ?? 0), 0);
  const { typ } = tagestypFuerDatum(profil, new Date(`${tag.datum}T12:00:00`));
  const mitMenge = (tag.eintraege ?? []).filter((e) => e.gramm > 0);
  const geloggt = mitMenge.length >= 3;
  const ist = geloggt ? tagesNaehrwerte(tag, profil, lebensmittel) : {};
  const go = geloggt ? gemueseObstGramm(tag, lebensmittel) : { gemuese: 0, obst: 0 };
  const aktiveSupps = profil.supplements.filter((s) => s.aktiv);
  return {
    datum: tag.datum,
    workouts: workouts.length,
    aktivitaeten: fertig.length - workouts.length,
    saetze,
    volumenKg,
    ausdauerMin,
    rekorde: fertig.reduce((s, t) => s + (t.rekorde?.length ?? 0), 0),
    geloggt,
    protein: geloggt && (ist.protein ?? 0) >= typ.protein * 0.95,
    kcalImZiel: geloggt && Math.abs((ist.kcal ?? 0) - typ.kcal) <= typ.kcal * 0.1,
    gemuese: go.gemuese >= typ.gemueseG,
    wasser: (tag.wasser ?? []).length > 0 && wasserBisUhrzeit(tag.wasser, profil.wasser.mittagspause) >= typ.wasserBisMittagMl,
    supplements: aktiveSupps.length > 0 && aktiveSupps.every((s) => tag.supplements?.[s.id]),
    gewicht: Boolean(tag.gewichtKg),
    tagebuch: Boolean(tag.tagebuch?.text?.trim()),
  };
}
