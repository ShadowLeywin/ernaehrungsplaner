// Reine Rechenfunktionen für Kalorien- und Makroziele (ohne DOM, mit node --test testbar).

export const KCAL_PRO_GRAMM = { protein: 4, kh: 4, fett: 9 };
const NAEHRWERTE = ['kcal', 'protein', 'kh', 'fett'];

export function kcalAusMakros({ protein, kh, fett }) {
  return protein * KCAL_PRO_GRAMM.protein + kh * KCAL_PRO_GRAMM.kh + fett * KCAL_PRO_GRAMM.fett;
}

/**
 * Makros für ein anderes Kalorienziel vorschlagen.
 * Protein bleibt fest, KH und Fett teilen sich die restlichen kcal im Verhältnis des Basistags.
 */
export function skaliereMakros(basis, zielKcal) {
  const proteinKcal = basis.protein * KCAL_PRO_GRAMM.protein;
  const restZiel = Math.max(0, zielKcal - proteinKcal);
  const khKcalBasis = basis.kh * KCAL_PRO_GRAMM.kh;
  const restBasis = khKcalBasis + basis.fett * KCAL_PRO_GRAMM.fett;
  const anteilKh = restBasis > 0 ? khKcalBasis / restBasis : 0.5;

  const kh = Math.round((restZiel * anteilKh) / KCAL_PRO_GRAMM.kh);
  // Fett aus dem Rest berechnen, damit die Summe das Ziel möglichst genau trifft
  const fett = Math.max(0, Math.round((restZiel - kh * KCAL_PRO_GRAMM.kh) / KCAL_PRO_GRAMM.fett));
  return { protein: basis.protein, kh, fett };
}

/** Wochentag 0 = Montag … 6 = Sonntag */
export function wochentagIndex(datum) {
  return (datum.getDay() + 6) % 7;
}

/** Lokales Datum als Schlüssel "2026-10-05" (nicht UTC, sonst springt der Tag um Mitternacht falsch). */
export function datumSchluessel(datum) {
  const zweistellig = (n) => String(n).padStart(2, '0');
  return `${datum.getFullYear()}-${zweistellig(datum.getMonth() + 1)}-${zweistellig(datum.getDate())}`;
}

export function tagestypFuerDatum(profil, datum) {
  const wochentag = wochentagIndex(datum);
  const eintrag = profil.woche[wochentag] ?? {};
  const typ = profil.tagestypen.find((t) => t.id === eintrag.tagestyp) ?? profil.tagestypen[0];
  return { typ, notiz: eintrag.notiz ?? '', wochentag };
}

export function summeAnteile(mahlzeiten) {
  return mahlzeiten.reduce((summe, m) => summe + (Number(m.anteil) || 0), 0);
}

/**
 * Tagesziel auf die Mahlzeiten verteilen.
 * `fix` sind feste Einträge (Morning Stack, Supplements), die vorher abgezogen werden.
 */
export function mahlzeitenZiele(tagesziel, mahlzeiten, fix = {}) {
  const rest = {};
  for (const k of NAEHRWERTE) rest[k] = Math.max(0, (tagesziel[k] ?? 0) - (fix[k] ?? 0));

  return mahlzeiten.map((m) => {
    const ziel = { id: m.id, name: m.name, anteil: m.anteil };
    for (const k of NAEHRWERTE) ziel[k] = Math.round((rest[k] * m.anteil) / 100);
    return ziel;
  });
}
