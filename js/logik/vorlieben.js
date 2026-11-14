// Mag-Liste: Wie gern isst jemand ein Obst oder Gemüse, und in welcher Form? Reine Funktionen.

export const MAG = [
  { id: 'J', name: 'Ja, roh und gekocht' },
  { id: 'R', name: 'Nur roh' },
  { id: 'K', name: 'Nur gekocht' },
  { id: 'N', name: 'Nein' },
  { id: 'S', name: 'Sonderfall' },
];

export const istMag = (wert) => MAG.some((m) => m.id === wert);
export const magName = (wert) => MAG.find((m) => m.id === wert)?.name ?? '';
export const istObstGemuese = (zutat) => zutat?.kategorie === 'obst' || zutat?.kategorie === 'gemuese';

/** Kurzer Zusatz in Suchlisten; leer, wenn nichts zu beachten ist. */
export function magHinweis(vorliebe) {
  switch (vorliebe?.mag) {
    case 'N': return 'magst du nicht';
    case 'R': return 'magst du nur roh';
    case 'K': return 'magst du nur gekocht';
    case 'S': return vorliebe.notiz ? `Sonderfall: ${vorliebe.notiz}` : 'Sonderfall';
    default: return '';
  }
}

/** Reihenfolge erhalten, aber alles mit "Nein" ans Ende stellen. vorlieben ist eine Map nach zutatId. */
export function sortiereNachVorliebe(liste, vorlieben) {
  const nein = (z) => vorlieben.get(z.id)?.mag === 'N';
  return [...liste.filter((z) => !nein(z)), ...liste.filter(nein)];
}

/**
 * Obst und Gemüse, das zur Zubereitung passt. zubereitung: 'roh', 'gekocht' oder null (egal).
 * "Nein" fällt immer weg, "Nur roh" fällt bei gekochten Gerichten weg und umgekehrt.
 * Was noch keine Angabe hat, bleibt drin: unbekannt heißt nicht unbeliebt.
 */
export function vorschlaege(zutaten, vorlieben, zubereitung = null) {
  return zutaten.filter((z) => {
    if (!istObstGemuese(z)) return false;
    const mag = vorlieben.get(z.id)?.mag;
    if (mag === 'N') return false;
    if (zubereitung === 'gekocht' && mag === 'R') return false;
    if (zubereitung === 'roh' && mag === 'K') return false;
    return true;
  });
}
