// Lagerfeuer als Spiegel der Beständigkeit (reine Funktionen).
// Ein Tag ist „aktiv“, wenn etwas erfasst wurde (Essen, Training, Gewicht oder Wasser). Ruhetage zählen also mit,
// sobald du z. B. dein Essen einträgst. Ein einzelner Tag Lücke wird verziehen (Schonfrist), ab zwei ist die Serie weg.
import { datumSchluessel } from './ziele.js';

export const FEUER_STUFEN = [
  { ab: 0, name: 'Glut', episch: 'Nur noch Glut', text: 'Trag heute etwas ein, dann lodert es wieder.' },
  { ab: 1, name: 'Funke', episch: 'Ein Funke', text: 'Ein Anfang ist gemacht.' },
  { ab: 3, name: 'Kleines Feuer', episch: 'Kleines Feuer', text: 'Es wärmt schon.' },
  { ab: 7, name: 'Lagerfeuer', episch: 'Lagerfeuer', text: 'Eine ganze Woche am Stück.' },
  { ab: 14, name: 'Großes Feuer', episch: 'Lodernde Flammen', text: 'Zwei Wochen – die Flammen schlagen hoch.' },
  { ab: 30, name: 'Esse', episch: 'Glut der Esse', text: 'Ein Monat. Hier wird Stahl geschmiedet.' },
];

const tagVorher = (schluessel, n = 1) => {
  const d = new Date(`${schluessel}T12:00:00`);
  d.setDate(d.getDate() - n);
  return datumSchluessel(d);
};

export function istAktiv(tag) {
  return Boolean((tag.eintraege ?? []).some((e) => e.gramm > 0)
    || (tag.trainings ?? []).some((t) => t.typ === 'aktivitaet' || t.ende)
    || tag.gewichtKg || (tag.wasser ?? []).length);
}

/** Aktuelle Serie in Tagen (mit einem Tag Schonfrist) bis heute. */
export function feuerSerie(aktiveTage, heute = datumSchluessel(new Date())) {
  const menge = new Set(aktiveTage);
  let tag = heute;
  // Heute noch nichts eingetragen? Dann zählt die Serie bis gestern weiter.
  if (!menge.has(tag)) tag = tagVorher(tag);
  if (!menge.has(tag)) {
    // Schonfrist: vorgestern aktiv reicht noch
    if (!menge.has(tagVorher(tag))) return 0;
    tag = tagVorher(tag);
  }
  let serie = 0;
  while (true) {
    if (menge.has(tag)) { serie += 1; tag = tagVorher(tag); continue; }
    if (menge.has(tagVorher(tag))) { tag = tagVorher(tag); continue; }
    return serie;
  }
}

export function feuerStufe(serie) {
  let i = FEUER_STUFEN.length - 1;
  while (i > 0 && serie < FEUER_STUFEN[i].ab) i -= 1;
  return { index: i, ...FEUER_STUFEN[i], naechste: FEUER_STUFEN[i + 1] ?? null };
}
