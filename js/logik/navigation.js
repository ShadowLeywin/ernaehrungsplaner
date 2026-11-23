// Richtung eines Seitenwechsels für die Übergangs-Animation. Reine Funktion.
// 'vor' schiebt die neue Seite von rechts herein, 'zurueck' von links, 'keine' blendet nur ein.

/** Reihenfolge der Leiste; Unterbereiche zählen zu ihrem Eintrag. */
const LEISTE = ['heute', 'woche', 'rezepte', 'health', 'mehr'];
const GEHOERT_ZU = { zutaten: 'rezepte', angebote: 'woche', einkauf: 'woche' };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const teile = (hash) => String(hash ?? '').replace(/^#\/?/, '').split('/').filter(Boolean);
const platz = (name) => LEISTE.indexOf(GEHOERT_ZU[name] ?? name);

export function richtungZwischen(altHash, neuHash) {
  const alt = teile(altHash);
  const neu = teile(neuHash);
  if (!alt.length || !neu.length) return 'keine';
  if (alt[0] === neu[0]) {
    // Blättern zwischen Tagen oder Wochen: später = vor
    if (ISO.test(alt[1] ?? '') || ISO.test(neu[1] ?? '')) {
      const a = ISO.test(alt[1] ?? '') ? alt[1] : null;
      const n = ISO.test(neu[1] ?? '') ? neu[1] : null;
      if (a && n && a !== n) return n > a ? 'vor' : 'zurueck';
      return 'keine'; // "Zu heute" ohne Datum: Richtung unbekannt
    }
    // Tiefer in eine Unterseite = vor, zurück nach oben = zurück
    if (neu.length !== alt.length) return neu.length > alt.length ? 'vor' : 'zurueck';
    return 'keine';
  }
  const a = platz(alt[0]);
  const n = platz(neu[0]);
  if (a < 0 || n < 0 || a === n) return 'keine';
  return n > a ? 'vor' : 'zurueck';
}
