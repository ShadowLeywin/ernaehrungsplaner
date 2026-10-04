// Chronik: fasst einen Tag automatisch in Worte – episch (Mittelalter-Ton) oder schlicht (reine Funktionen).
// Tagebuch im Tagesdatensatz: tag.tagebuch = { text, stimmung (1–5), energie (1–5), schlafH }
import { tagesNaehrwerte } from './tag.js';
import { statistik, dauerMin } from './training.js';
import { wasserSumme } from './wasser.js';

export const STIMMUNGEN = ['😣', '😕', '😐', '🙂', '😄'];

const fmt = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
const ganz = (x) => fmt.format(Math.round(x));

/** Teile der Chronik als Liste von Sätzen. stil: 'episch' | 'schlicht' */
export function chronik(tag, { profil, lebensmittel, verzeichnis }, stil = 'episch') {
  const e = stil === 'episch';
  const saetze = [];
  const mitMenge = (tag.eintraege ?? []).filter((x) => x.gramm > 0);
  if (mitMenge.length) {
    const w = tagesNaehrwerte(tag, profil, lebensmittel);
    saetze.push(e
      ? `An der Tafel wurden ${ganz(w.kcal ?? 0)} kcal verzehrt, darunter ${ganz(w.protein ?? 0)} g Protein.`
      : `${ganz(w.kcal ?? 0)} kcal, ${ganz(w.protein ?? 0)} g Protein (${mitMenge.length} Einträge).`);
  }
  const trainings = (tag.trainings ?? []).filter((t) => t.typ === 'aktivitaet' || t.ende);
  for (const t of trainings) {
    if (t.typ === 'workout') {
      const st = statistik(t);
      const saetzeText = `${st.saetze} ${st.saetze === 1 ? 'Satz' : 'Sätze'}`;
      const tonnen = st.volumen >= 1000 ? `${fmt.format(st.volumen / 1000)} t` : `${ganz(st.volumen)} kg`;
      saetze.push(e
        ? `Auf dem Übungsplatz: „${t.name}“ – ${saetzeText}, ${tonnen} bewegt${t.rekorde?.length ? `, ${t.rekorde.length} neue Bestmarke${t.rekorde.length === 1 ? '' : 'n'}` : ''}.`
        : `Training „${t.name}“: ${saetzeText}, ${tonnen}, ${dauerMin(t)} min${t.rekorde?.length ? `, ${t.rekorde.length} Rekord${t.rekorde.length === 1 ? '' : 'e'}` : ''}.`);
    } else {
      const name = verzeichnis.get(t.uebungId)?.name ?? 'Aktivität';
      saetze.push(e
        ? `${t.km ? `${fmt.format(t.km)} km ` : ''}${name} – ${t.dauerMin} Minuten unterwegs.`
        : `${name}: ${t.dauerMin} min${t.km ? `, ${fmt.format(t.km)} km` : ''}.`);
    }
  }
  const ml = wasserSumme(tag.wasser ?? []);
  if (ml) saetze.push(e ? `Die Quelle spendete ${fmt.format(ml / 1000)} l.` : `Wasser: ${fmt.format(ml / 1000)} l.`);
  if (tag.gewichtKg) saetze.push(e ? `Die Waage zeigte ${fmt.format(tag.gewichtKg)} kg.` : `Gewicht: ${fmt.format(tag.gewichtKg)} kg.`);
  if (!saetze.length) saetze.push(e ? 'Ein stiller Tag. Die Glut ruhte.' : 'Keine Einträge.');
  return saetze;
}

/** Hat ein Tag etwas, das in die Chronik gehört? */
export function tagHatInhalt(tag) {
  return Boolean((tag.eintraege ?? []).some((x) => x.gramm > 0) || (tag.trainings ?? []).some((t) => t.typ === 'aktivitaet' || t.ende)
    || (tag.wasser ?? []).length || tag.gewichtKg || tag.tagebuch?.text?.trim() || tag.tagebuch?.stimmung);
}
