// Referenzwerte der DGE für Erwachsene: Auswahl der Gruppe und Vergleich. Reine Funktionen.
// Die Werte selbst stehen mit Quelle und Abrufdatum in data/referenzwerte.json.

export const GESCHLECHTER = [
  { id: 'm', name: 'männlich' },
  { id: 'w', name: 'weiblich' },
];

/** Gespeicherte Auswahl prüfen. Unvollständig heißt: kein Vergleich, statt geraten. */
export function bereinigeGruppe(roh, daten) {
  const geschlecht = GESCHLECHTER.some((g) => g.id === roh?.geschlecht) ? roh.geschlecht : null;
  const alter = daten?.altersgruppen?.some((a) => a.id === roh?.alter) ? roh.alter : null;
  return geschlecht && alter ? { geschlecht, alter } : null;
}

/** Referenzwerte für eine Gruppe: { naehrstoffId: { wert, hinweis } } */
export function werteFuer(daten, gruppe) {
  if (!daten || !gruppe) return {};
  const index = daten.altersgruppen.findIndex((a) => a.id === gruppe.alter);
  if (index < 0) return {};
  const ergebnis = {};
  for (const [id, eintrag] of Object.entries(daten.werte)) {
    const wert = eintrag[gruppe.geschlecht]?.[index];
    if (typeof wert === 'number') ergebnis[id] = { wert, hinweis: eintrag.hinweis ?? null };
  }
  return ergebnis;
}

/** Anteil am Referenzwert in ganzen Prozent, oder null, wenn es keinen Wert gibt */
export function prozent(ist, referenz) {
  if (!(referenz > 0) || typeof ist !== 'number') return null;
  return Math.round((ist / referenz) * 100);
}
