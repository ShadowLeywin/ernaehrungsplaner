// Datumshilfen. Ein Tag ist immer ein Text der Form "2026-11-13" in Ortszeit.

const MUSTER = /^(\d{4})-(\d{2})-(\d{2})$/;

const zwei = (n) => String(n).padStart(2, '0');

/** Date → "JJJJ-MM-TT" in Ortszeit (nicht UTC, sonst kippt der Tag nachts). */
export function isoDatum(d = new Date()) {
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
}

/** "JJJJ-MM-TT" → Date um 12 Uhr mittags. Mittag vermeidet Sprünge bei der Zeitumstellung. */
export function ausIso(iso) {
  const [, j, m, t] = MUSTER.exec(iso);
  return new Date(Number(j), Number(m) - 1, Number(t), 12);
}

export function istGueltig(iso) {
  if (typeof iso !== 'string' || !MUSTER.test(iso)) return false;
  return isoDatum(ausIso(iso)) === iso; // fängt 2026-02-31 ab
}

export function verschiebe(iso, tage) {
  const d = ausIso(iso);
  d.setDate(d.getDate() + tage);
  return isoDatum(d);
}

/** Montag = 0 … Sonntag = 6 */
export const wochentagIndex = (iso) => (ausIso(iso).getDay() + 6) % 7;

export const WOCHENTAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

/** "Freitag, 13. November" */
export function formatLang(iso) {
  return new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(ausIso(iso));
}

/** "13. November" */
export function formatTag(iso) {
  return new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long' }).format(ausIso(iso));
}

/** "13.11.2026" */
export function formatKurz(iso) {
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(ausIso(iso));
}

/** "Heute", "Gestern", "Morgen" oder null */
export function relativ(iso, heute = isoDatum()) {
  if (iso === heute) return 'Heute';
  if (iso === verschiebe(heute, -1)) return 'Gestern';
  if (iso === verschiebe(heute, 1)) return 'Morgen';
  return null;
}
