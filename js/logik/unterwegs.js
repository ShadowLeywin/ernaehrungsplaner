// Unterwegs: Gerichte von Restaurants und Imbissen (z. B. Burger, Pommes M, Cola 0,5 l) mit Werten je Stück.
// Man tippt sich eine Bestellung zusammen, sieht die Summe und trägt alles mit einem Tipp ein.
// Reine Funktionen. Die Liste liegt als Einstellung „unterwegs“ auf dem Gerät; Elan liefert keine Werte mit,
// weil sich Rezepturen ändern und falsche Nährwerte schlimmer sind als keine.

import { pruefeSchnell, schnellEintrag } from './schnell.js';

export const MAX_GERICHTE = 1000;
const WERTE = ['kcal', 'protein', 'kh', 'fett'];

const text = (wert, max) => String(wert ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
/** Kennung aus Restaurant und Name: gleiches Gericht zweimal anlegen ersetzt statt verdoppelt */
export const gerichtId = (restaurant, name) => `${restaurant}|${name}`.toLocaleLowerCase('de');

/**
 * Eingabe aus dem Formular prüfen: { restaurant, name, kcal, protein, kh, fett } als Text.
 * Ergebnis { ok: true, gericht } oder { ok: false, fehler: { feld: text } }.
 */
export function pruefeGericht(eingabe) {
  const fehler = {};
  const restaurant = text(eingabe?.restaurant, 40);
  const name = text(eingabe?.name, 80);
  if (!restaurant) fehler.restaurant = 'Wo gibt es das? Zum Beispiel der Name des Restaurants.';
  if (!name) fehler.name = 'Wie heißt das Gericht?';
  const werte = pruefeSchnell({ ...eingabe, name: name || 'x' });
  if (!werte.ok) Object.assign(fehler, werte.fehler);
  if (Object.keys(fehler).length) return { ok: false, fehler };
  return { ok: true, gericht: { id: gerichtId(restaurant, name), restaurant, name, ...werte.je100 } };
}

/** Gespeicherte Liste prüfen: Unbrauchbares fällt weg, Doppelte zählen einmal, sortiert nach Restaurant und Name */
export function bereinigeGerichte(roh) {
  const nachId = new Map();
  for (const g of Array.isArray(roh) ? roh : []) {
    const restaurant = text(g?.restaurant, 40);
    const name = text(g?.name, 80);
    if (!restaurant || !name || !(typeof g.kcal === 'number' && g.kcal >= 0 && g.kcal <= 5000)) continue;
    const sauber = { id: gerichtId(restaurant, name), restaurant, name };
    for (const w of WERTE) if (typeof g[w] === 'number' && Number.isFinite(g[w]) && g[w] >= 0) sauber[w] = g[w];
    nachId.set(sauber.id, sauber);
  }
  return [...nachId.values()].sort((a, b) => a.restaurant.localeCompare(b.restaurant, 'de') || a.name.localeCompare(b.name, 'de')).slice(0, MAX_GERICHTE);
}

/** Restaurants in der Liste, alphabetisch */
export const restaurants = (gerichte) => [...new Set(gerichte.map((g) => g.restaurant))].sort((a, b) => a.localeCompare(b, 'de'));

/** Neues oder geändertes Gericht einsetzen; altId, wenn sich Restaurant oder Name geändert haben */
export const setzeGericht = (gerichte, gericht, altId = null) => bereinigeGerichte([...gerichte.filter((g) => g.id !== altId && g.id !== gericht.id), gericht]);

/** Summe einer Bestellung. korb: Map id → Anzahl */
export function korbSumme(gerichte, korb) {
  const summe = { anzahl: 0, kcal: 0, protein: 0, kh: 0, fett: 0 };
  for (const g of gerichte) {
    const n = korb.get(g.id) ?? 0;
    if (n <= 0) continue;
    summe.anzahl += n;
    for (const w of WERTE) summe[w] += (g[w] ?? 0) * n;
  }
  return summe;
}

/** Bestellung als Tagebuch-Einträge: je Gericht einer, „2× Name“, das Restaurant steht als Marke dabei */
export function korbEintraege(gerichte, korb, datum, slot) {
  return gerichte.filter((g) => (korb.get(g.id) ?? 0) > 0).map((g) => {
    const n = korb.get(g.id);
    const je100 = Object.fromEntries(WERTE.filter((w) => typeof g[w] === 'number').map((w) => [w, Math.round(g[w] * n * 10) / 10]));
    return { ...schnellEintrag({ name: n > 1 ? `${n}× ${g.name}` : g.name, je100 }, datum, slot), marke: g.restaurant };
  });
}

/**
 * Datei mit Gerichten lesen (Format in docs/UNTERWEGS-FORMAT.md):
 * { "format": "elan-unterwegs", "version": 1, "quelle": "…", "stand": "JJJJ-MM-TT",
 *   "restaurants": [{ "name": "…", "gerichte": [{ "name": "…", "kcal": 0, "protein": 0, "kh": 0, "fett": 0 }] }] }
 * Ergebnis { ok: true, gerichte, quelle, stand, verworfen } oder { ok: false, fehler }.
 */
export function leseUnterwegsDatei(inhalt) {
  let daten;
  try { daten = typeof inhalt === 'string' ? JSON.parse(inhalt) : inhalt; } catch { return { ok: false, fehler: 'Die Datei ist kein gültiges JSON.' }; }
  if (daten?.format !== 'elan-unterwegs') return { ok: false, fehler: 'Das ist keine Unterwegs-Liste für Elan (Feld „format“ fehlt).' };
  if (daten.version !== 1) return { ok: false, fehler: `Version ${daten.version} kennt diese Elan-Fassung nicht.` };
  const roh = (Array.isArray(daten.restaurants) ? daten.restaurants : [])
    .flatMap((r) => (Array.isArray(r?.gerichte) ? r.gerichte : []).map((g) => ({ ...g, restaurant: r?.name })));
  const gerichte = bereinigeGerichte(roh);
  if (!gerichte.length) return { ok: false, fehler: 'In der Datei steht kein brauchbares Gericht.' };
  return { ok: true, gerichte, quelle: text(daten.quelle, 200), stand: /^\d{4}-\d{2}-\d{2}$/.test(daten.stand ?? '') ? daten.stand : '', verworfen: roh.length - gerichte.length };
}

/** Geladene Gerichte zur eigenen Liste nehmen; gleiche (Restaurant + Name) werden ersetzt */
export const fuegeZusammen = (alt, neu) => bereinigeGerichte([...alt, ...neu]);
