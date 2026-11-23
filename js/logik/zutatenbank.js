// Zutaten-Datenbank wie in großen Ernährungs-Apps (P6): Favoriten, Filter, eigene Portionen, Werte je Portion.
// Reine Funktionen. Gespeichert wird als Einstellung (zutatFavoriten, portionenExtra), keine neue Schema-Version.

import { runde } from './naehrwerte.js';
import { sucheZutaten } from './suche.js';
import { parseZahl } from './zutat.js';

export const MAX_FAVORITEN = 200;

/** Liste der Favoriten (Kennungen) aus der Einstellung: nur Texte, ohne Doppelte, höchstens 200 */
export function bereinigeFavoriten(roh) {
  if (!Array.isArray(roh)) return [];
  return [...new Set(roh.filter((x) => typeof x === 'string' && x))].slice(0, MAX_FAVORITEN);
}

/** Stern umschalten: neuer Favorit vorn, entfernen lässt die Reihenfolge der übrigen */
export function schalteFavorit(favoriten, id) {
  const liste = bereinigeFavoriten(favoriten);
  return liste.includes(id) ? liste.filter((x) => x !== id) : [id, ...liste].slice(0, MAX_FAVORITEN);
}

/**
 * Zutatenliste filtern und suchen.
 * filter: 'alle' | 'favoriten' | 'eigene'; kategorie: Kategorie-Kennung oder null.
 * Ohne Suchbegriff stehen Favoriten vorn (in ihrer Reihenfolge), dann der Rest wie gewohnt.
 */
export function zutatenAuswahl(zutaten, { begriff = '', filter = 'alle', kategorie = null, favoriten = [], istEigen = () => false } = {}) {
  const fav = bereinigeFavoriten(favoriten);
  const favSet = new Set(fav);
  let auswahl = zutaten;
  if (filter === 'favoriten') auswahl = auswahl.filter((z) => favSet.has(z.id));
  if (filter === 'eigene') auswahl = auswahl.filter(istEigen);
  if (kategorie) auswahl = auswahl.filter((z) => (z.kategorie ?? 'sonstiges') === kategorie);
  if (begriff.trim()) return sucheZutaten(auswahl, begriff, 200);
  const rang = new Map(fav.map((id, i) => [id, i]));
  return [...auswahl].sort((a, b) => (rang.has(a.id) ? rang.get(a.id) : Infinity) - (rang.has(b.id) ? rang.get(b.id) : Infinity) || a.name.localeCompare(b.name, 'de'));
}

/** Eigene Portion prüfen: { name, gramm }. Liefert { ok, fehler, portion } */
export function pruefePortion(eingabe) {
  const fehler = {};
  const name = String(eingabe.name ?? '').trim();
  if (!name) fehler.name = 'Wie heißt die Portion? Zum Beispiel „Becher“.';
  else if (name.length > 30) fehler.name = 'Höchstens 30 Zeichen.';
  const gramm = parseZahl(eingabe.gramm);
  if (gramm === null || Number.isNaN(gramm) || gramm <= 0 || gramm > 5000) fehler.gramm = 'Gramm je Portion, zum Beispiel 150.';
  if (Object.keys(fehler).length) return { ok: false, fehler, portion: null };
  return { ok: true, fehler, portion: { name, gramm: runde(gramm, 1) } };
}

/**
 * Portionen einer Zutat mit den selbst angelegten zusammenführen (mitgelieferte Zutaten sind nur lesbar,
 * ihre zusätzlichen Portionen liegen in der Einstellung portionenExtra). Gleiche Namen: die eigene gewinnt.
 */
export function mitExtraPortionen(zutat, extra = {}) {
  const eigene = Array.isArray(extra?.[zutat.id]) ? extra[zutat.id] : [];
  if (!eigene.length) return zutat;
  const namen = new Set(eigene.map((p) => p.name.toLowerCase()));
  return { ...zutat, portionen: [...(zutat.portionen ?? []).filter((p) => !namen.has(p.name.toLowerCase())), ...eigene] };
}

/** Einstellung portionenExtra um eine Portion ergänzen (oder ersetzen bei gleichem Namen) */
export function ergaenzePortion(extra, zutatId, portion) {
  const alt = Array.isArray(extra?.[zutatId]) ? extra[zutatId] : [];
  return { ...(extra ?? {}), [zutatId]: [...alt.filter((p) => p.name.toLowerCase() !== portion.name.toLowerCase()), portion].slice(-10) };
}

/**
 * Zeilen der Nährwerttabelle für eine Menge: jeder Nährstoff der Liste, fehlende als "unbekannt".
 * Liefert [{ id, name, einheit, wert | null, unter }].
 */
export function naehrwertZeilen(je100, naehrstoffe, gramm = 100) {
  return naehrstoffe.map((n) => {
    const roh = je100?.[n.id];
    const wert = typeof roh === 'number' && Number.isFinite(roh) ? runde((roh * gramm) / 100, n.einheit === 'kcal' ? 0 : 2) : null;
    return { id: n.id, name: n.name, einheit: n.einheit, unter: Boolean(n.unter), wert };
  });
}
