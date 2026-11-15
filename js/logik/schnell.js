// Schnell eintragen: Essen ohne Datenbank-Eintrag (Mensa, Restaurant, Snack bei Freunden), nur mit Kalorien
// und, wenn bekannt, Makros. Reine Funktionen. Der Eintrag gilt als eine Portion: gramm 100 und je100 = die
// Werte der Portion, so rechnen Summen, Wochenschnitt und Coach-Bericht ohne Sonderfall mit.

import { parseZahl } from './zutat.js';

export const SCHNELL_NAME = 'Schnell eingetragen';

const FELDER = [
  { id: 'kcal', max: 5000, name: 'Kalorien' },
  { id: 'protein', max: 500, name: 'Eiweiß' },
  { id: 'kh', max: 1000, name: 'Kohlenhydrate' },
  { id: 'fett', max: 500, name: 'Fett' },
];

/** kcal aus den Makros (Atwater: 4 / 4 / 9 kcal je Gramm), für den Fall, dass nur Makros bekannt sind */
export const kcalAusMakros = ({ protein = 0, kh = 0, fett = 0 }) => Math.round(protein * 4 + kh * 4 + fett * 9);

/**
 * Eingabe prüfen. eingabe: { name, kcal, protein, kh, fett } als Text (Komma erlaubt).
 * Ergebnis { ok: true, name, je100 } oder { ok: false, fehler: { feld: text } }.
 * kcal darf leer sein, wenn Makros da sind: dann rechnet Elan sie aus.
 */
export function pruefeSchnell(eingabe) {
  const fehler = {};
  const werte = {};
  for (const f of FELDER) {
    const text = String(eingabe?.[f.id] ?? '').trim();
    if (!text) continue;
    const wert = parseZahl(text);
    if (wert === null || !Number.isFinite(wert) || wert < 0 || wert > f.max) fehler[f.id] = `${f.name}: eine Zahl von 0 bis ${f.max.toLocaleString('de-DE')}.`;
    else werte[f.id] = Math.round(wert * 10) / 10;
  }
  const hatMakros = ['protein', 'kh', 'fett'].some((id) => id in werte);
  if (!('kcal' in werte) && !fehler.kcal) {
    if (hatMakros) werte.kcal = kcalAusMakros(werte);
    else fehler.kcal = 'Trag die Kalorien ein oder mindestens einen Makro-Wert.';
  }
  if (Object.keys(fehler).length) return { ok: false, fehler };
  const name = String(eingabe?.name ?? '').trim().slice(0, 80) || SCHNELL_NAME;
  return { ok: true, name, je100: werte };
}

/** Tagebuch-Eintrag ohne Zutat: eine Portion = 100 „g“, damit fuerMenge die Werte unverändert lässt */
export const schnellEintrag = ({ name, je100 }, datum, slot) => ({ datum, slot, name, marke: '', gramm: 100, je100, schnell: true });

/** Gespeicherte Werte zurück in Formulartext (für „ändern“) */
export const schnellAlsText = (eintrag) => Object.fromEntries([['name', eintrag.name === SCHNELL_NAME ? '' : eintrag.name],
  ...FELDER.map((f) => [f.id, typeof eintrag.je100?.[f.id] === 'number' ? String(eintrag.je100[f.id]).replace('.', ',') : ''])]);
