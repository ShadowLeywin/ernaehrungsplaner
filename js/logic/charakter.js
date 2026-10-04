// Charakter: sechs Werte (1–100), Erfahrung (XP), Level und Klasse nach den Stärken (reine Funktionen).
// Werte bilden die letzten Wochen ab (sie können auch sinken), XP und Level wachsen nur.

export const WERTE = {
  staerke: { name: 'Stärke', kurz: 'STÄ', text: 'Kraft im Verhältnis zum Körpergewicht (Ränge der letzten 12 Wochen)' },
  ausdauer: { name: 'Ausdauer', kurz: 'AUS', text: 'Ausdauer-Minuten pro Woche (letzte 4 Wochen)' },
  tempo: { name: 'Tempo', kurz: 'TEM', text: 'Bestes Lauf- oder Radtempo, Sprints und HIIT' },
  beweglichkeit: { name: 'Beweglichkeit', kurz: 'BEW', text: 'Mobility, Dehnen und Yoga pro Woche (letzte 4 Wochen)' },
  willenskraft: { name: 'Willenskraft', kurz: 'WIL', text: 'Harte Einheiten, starke Wochen und Ausdauer im Dranbleiben' },
  disziplin: { name: 'Disziplin', kurz: 'DIS', text: 'Erfassen, Wiegen, Wasser und Supplements (letzte 4 Wochen)' },
};

const begrenze = (x) => Math.round(Math.max(1, Math.min(100, x)));

/** st: Spielstand, raenge: Ergebnis von berechneRaenge */
export function berechneWerte(st, raenge) {
  const gewertet = Object.values(raenge.gruppen).filter(Boolean);
  // Stärke: Schnitt der Gruppen, nicht trainierte Gruppen zählen mit einem kleinen Wert
  const staerkeBasis = Object.values(raenge.gruppen).reduce((s, g) => s + (g ? Math.min(g.wertung, 1.1) : 0.05), 0) / Object.keys(raenge.gruppen).length;
  const laufTempo = st.maxLaufKmh ? ((st.maxLaufKmh - 6) / 11) * 95 : 0;
  const radTempo = st.maxRadKmh ? ((st.maxRadKmh - 12) / 26) * 80 : 0;
  return {
    staerke: begrenze(gewertet.length ? 5 + staerkeBasis * 95 : 3),
    ausdauer: begrenze(3 + st.cardioMin28 / 4 / 3),
    tempo: begrenze(Math.max(laufTempo, radTempo, 3)),
    beweglichkeit: begrenze(3 + st.mobilityMin28 / 4 / 1.2),
    willenskraft: begrenze(3 + st.hartEinheiten * 2 + st.starkeWochen * 4 + st.workouts * 0.3 + st.trainings28 * 1.5),
    disziplin: begrenze(3 + (st.logTage28 / 28) * 50 + (st.gewichtTage28 / 28) * 20 + (st.wasserTage28 / 28) * 15 + (st.supplementTage28 / 28) * 12),
  };
}

/** Erfahrungspunkte aus allem, was je erledigt wurde. */
export function berechneXp(st, xpAusErfolgen = 0) {
  return Math.round(
    st.workouts * 50 + st.saetze * 2 + st.aktivitaeten * 30 + st.cardioMin * 0.5 + st.mobilityMin * 0.5
    + st.logTage.length * 20 + st.gewichtTage * 5 + st.wasserTage * 10 + st.proteinTage * 10 + st.rekorde * 25
    + st.tagebuchTage * 10 + xpAusErfolgen,
  );
}

/** XP, die für den Schritt von Level n auf n+1 nötig sind. */
export const xpFuerStufe = (n) => Math.round(100 * n ** 1.5);

export function levelAus(xp) {
  let level = 1;
  let rest = xp;
  while (rest >= xpFuerStufe(level)) { rest -= xpFuerStufe(level); level += 1; }
  return { level, xpInStufe: rest, xpBisNaechste: xpFuerStufe(level), anteil: rest / xpFuerStufe(level) };
}

const KLASSEN = {
  staerke: ['Schmied', 'Kraftathlet'],
  ausdauer: ['Waldläufer', 'Ausdauerathlet'],
  tempo: ['Bote', 'Sprinter'],
  beweglichkeit: ['Akrobat', 'Mobilitätskünstler'],
  willenskraft: ['Paladin', 'Kämpfer'],
  disziplin: ['Mönch', 'Stratege'],
};
// Doppelklassen, wenn zwei Werte fast gleich stark sind
const DOPPEL = {
  'ausdauer+staerke': ['Krieger', 'Hybridathlet'],
  'beweglichkeit+staerke': ['Gladiator', 'Calisthenics-Athlet'],
  'staerke+willenskraft': ['Berserker', 'Powerathlet'],
  'disziplin+staerke': ['Ordensritter', 'Disziplinierter Athlet'],
  'staerke+tempo': ['Kriegsbote', 'Explosivathlet'],
  'ausdauer+tempo': ['Windreiter', 'Läufer'],
  'ausdauer+beweglichkeit': ['Druide', 'Allrounder'],
  'ausdauer+willenskraft': ['Pilger', 'Ausdauerkämpfer'],
  'ausdauer+disziplin': ['Wächter', 'Ausdauer-Stratege'],
  'beweglichkeit+tempo': ['Schattenläufer', 'Agilitätsathlet'],
  'beweglichkeit+willenskraft': ['Mönchskrieger', 'Körperbeherrscher'],
  'beweglichkeit+disziplin': ['Asket', 'Ausgeglichener'],
  'tempo+willenskraft': ['Sturmreiter', 'Wettkämpfer'],
  'disziplin+tempo': ['Kundschafter', 'Präzisionsathlet'],
  'disziplin+willenskraft': ['Templer', 'Eiserner Wille'],
};

/** Klasse nach den zwei stärksten Werten. Liefert { id, episch, schlicht, haupt, neben } */
export function bestimmeKlasse(werte) {
  const sortiert = Object.entries(werte).sort((a, b) => b[1] - a[1]);
  const [[haupt, a], [neben, b]] = sortiert;
  if (a < 12) return { id: 'lehrling', episch: 'Lehrling', schlicht: 'Einsteiger', haupt, neben };
  if (b >= a * 0.85) {
    const schluessel = [haupt, neben].sort().join('+');
    const [episch, schlicht] = DOPPEL[schluessel];
    return { id: schluessel, episch, schlicht, haupt, neben };
  }
  const [episch, schlicht] = KLASSEN[haupt];
  return { id: haupt, episch, schlicht, haupt, neben };
}

/** Klassenname aus der Klassen-ID (z. B. von einer Rangkarte): [episch, schlicht] oder null. */
export function klassenName(id) {
  if (id === 'lehrling') return ['Lehrling', 'Einsteiger'];
  return KLASSEN[id] ?? DOPPEL[id] ?? null;
}
