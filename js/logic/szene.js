// Lager-Szenen: Je höher dein Level, desto prächtiger der Ort deines Lagerfeuers (reine Funktionen).
// Bilder liegen unter bilder/lager/szene-<nr>.webp (Prompts: docs/bild-prompts.md).

export const SZENEN = [
  { nr: 1, ab: 1, name: 'Lichtung', episch: 'Eine Lichtung im dunklen Wald' },
  { nr: 2, ab: 5, name: 'Befestigtes Lager', episch: 'Ein Lager hinter Palisaden' },
  { nr: 3, ab: 10, name: 'Schmiedelager', episch: 'Das Lager an der Esse' },
  { nr: 4, ab: 20, name: 'Bergfeste', episch: 'Die Feste am Berg' },
  { nr: 5, ab: 35, name: 'Zwergenhalle', episch: 'Die Halle unter dem Berg' },
  { nr: 6, ab: 50, name: 'Esse der Legenden', episch: 'Die Esse der Legenden' },
];

/** Szene für ein Level, dazu die nächste (oder null). */
export function szeneFuerLevel(level) {
  let i = SZENEN.length - 1;
  while (i > 0 && level < SZENEN[i].ab) i -= 1;
  return { ...SZENEN[i], naechste: SZENEN[i + 1] ?? null };
}
