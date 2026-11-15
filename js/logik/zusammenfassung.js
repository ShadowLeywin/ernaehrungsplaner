// Kurze Zusammenfassungen für das Menü „Mehr“: Jede Zeile zeigt den aktuellen Stand statt einer festen Beschreibung
// („Blatt · Dunkel · Vibration an“). So sieht man ohne Antippen, wie die App eingestellt ist. Reine Funktionen.

import { tageZwischen } from './datum.js';
import { STANDARD_ANTEILE, TAGESTYPEN } from './ziele.js';

const zahl = (n) => Math.round(n).toLocaleString('de-DE');

/** "November 2026" für den frühesten Tag, oder null ohne Daten. */
export function dabeiSeit(daten) {
  const erster = [...(daten ?? [])].filter(Boolean).sort()[0];
  if (!erster) return null;
  const [j, m] = erster.split('-').map(Number);
  return new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(new Date(j, m - 1, 15));
}

/** Kennzahlen oben im Menü: Tage mit Einträgen, Einträge, Rezepte. */
export function kennzahlen({ eintraege = [], rezepte = [] }) {
  return { tage: new Set(eintraege.map((e) => e.datum)).size, eintraege: eintraege.length, rezepte: rezepte.length };
}

/** "2.500 kcal je Tag" oder "2.300 bis 2.700 kcal je Tag" */
export function zieleText(ziele) {
  const werte = TAGESTYPEN.map((t) => ziele?.[t.id]?.kcal).filter((k) => typeof k === 'number');
  if (!werte.length) return '';
  const min = Math.min(...werte);
  const max = Math.max(...werte);
  return min === max ? `${zahl(min)} kcal je Tag` : `${zahl(min)} bis ${zahl(max)} kcal je Tag`;
}

/** "3× Gym · 2× Calisthenics · 2× Rest" (nur vorkommende Typen, feste Reihenfolge) */
export function wochenplanText(woche) {
  return TAGESTYPEN.map((t) => [t.name, (woche ?? []).filter((x) => x === t.id).length])
    .filter(([, n]) => n > 0).map(([name, n]) => `${n}× ${name}`).join(' · ');
}

export const anteileText = (anteile) => (Object.entries(STANDARD_ANTEILE).every(([id, p]) => anteile?.[id] === p)
  ? 'Standard-Aufteilung auf sechs Mahlzeiten' : 'Eigene Aufteilung auf sechs Mahlzeiten');

/** "männlich · 25 bis 50 Jahre" oder "Keine Angabe" */
export function referenzText(gruppe, geschlechter, altersgruppen) {
  const g = geschlechter?.find((x) => x.id === gruppe?.geschlecht);
  const a = altersgruppen?.find((x) => x.id === gruppe?.alter);
  return g && a ? `${g.name} · ${a.name}` : 'Keine Angabe';
}

export const koerperText = (gesundheit, mengen) => `Wasser ${zahl(gesundheit.wasserZielMl)} ml · Knöpfe ${mengen.map(zahl).join(' / ')}`;

/** "Noch kein Backup", "Heute gesichert", "Gesichert vor 3 Tagen" */
export function backupText(letztesBackup, heute) {
  if (!letztesBackup) return 'Noch kein Backup';
  const tage = tageZwischen(String(letztesBackup).slice(0, 10), heute);
  if (tage <= 0) return 'Heute gesichert';
  if (tage === 1) return 'Gestern gesichert';
  return `Gesichert vor ${tage} Tagen`;
}

export function darstellungText({ thema, modus, vibration }) {
  const t = { blatt: 'Blatt', zitrus: 'Zitrus' }[thema] ?? thema;
  const m = { dunkel: 'Dunkel', hell: 'Hell', system: 'Wie das Handy' }[modus] ?? modus;
  return `${t} · ${m} · Vibration ${vibration ? 'an' : 'aus'}`;
}

export const anzahlText = (n, eins, mehr, leer) => (n === 0 ? leer : `${zahl(n)} ${n === 1 ? eins : mehr}`);
