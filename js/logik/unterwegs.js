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

/* ---------- Vorschläge: Was passt in mein Budget? ---------- */

/** Wonach sortiert wird. Neutral benannt: Elan bewertet nicht, es sortiert nach deiner Wahl. */
export const ZIELE_VORSCHLAG = [
  { id: 'eiweiss', name: 'Viel Eiweiß' },
  { id: 'fett', name: 'Wenig Fett' },
  { id: 'satt', name: 'Budget voll' },
];

const wert = (g, w) => (typeof g[w] === 'number' ? g[w] : 0);

/**
 * Kombinationen aus 1 bis maxTeile Gerichten eines Restaurants (jedes Gericht höchstens einmal), die ins
 * Budget passen und es zu mindestens untergrenze (Anteil) nutzen. Sortiert nach ziel, dann näher am Budget.
 * Ergebnis: [{ ids, gerichte, kcal, protein, kh, fett }], höchstens anzahl Stück, ohne Kombinationen, die nur
 * eine schlechtere Obermenge einer besseren sind.
 * Bei 100 Gerichten sind das gut 160.000 Dreier: durchprobieren ist schnell genug und findet sicher das Beste.
 */
export function vorschlaege(gerichte, { restaurant, budget, ziel = 'eiweiss', maxTeile = 3, anzahl = 5, untergrenze = 0.6 }) {
  if (!(budget > 0)) return [];
  const auswahl = gerichte.filter((g) => g.restaurant === restaurant && g.kcal > 0 && g.kcal <= budget);
  const ergebnis = [];
  const pruefe = (teile) => {
    const s = { kcal: 0, protein: 0, kh: 0, fett: 0 };
    for (const g of teile) for (const w of WERTE) s[w] += wert(g, w);
    if (s.kcal > budget || s.kcal < budget * untergrenze) return;
    ergebnis.push({ ids: teile.map((g) => g.id), gerichte: teile, ...s });
  };
  const n = auswahl.length;
  for (let i = 0; i < n; i += 1) {
    pruefe([auswahl[i]]);
    if (maxTeile < 2) continue;
    for (let j = i + 1; j < n; j += 1) {
      if (auswahl[i].kcal + auswahl[j].kcal > budget) continue;
      pruefe([auswahl[i], auswahl[j]]);
      if (maxTeile < 3) continue;
      for (let k = j + 1; k < n; k += 1) pruefe([auswahl[i], auswahl[j], auswahl[k]]);
    }
  }
  const bewertung = {
    eiweiss: (v) => -v.protein,
    fett: (v) => v.fett,
    satt: (v) => budget - v.kcal,
  }[ziel] ?? ((v) => -v.protein);
  // Gleichstand: weniger Teile zuerst (eine Cola Zero dazu bringt nichts), dann näher am Budget
  ergebnis.sort((a, b) => bewertung(a) - bewertung(b) || a.ids.length - b.ids.length || (budget - a.kcal) - (budget - b.kcal));
  // Abwechslung: kein Vorschlag, der nur ein früherer plus ein Extra ist
  const gewaehlt = [];
  for (const v of ergebnis) {
    if (gewaehlt.some((x) => x.ids.every((id) => v.ids.includes(id)) || v.ids.every((id) => x.ids.includes(id)))) continue;
    gewaehlt.push(v);
    if (gewaehlt.length >= anzahl) break;
  }
  return gewaehlt;
}

/**
 * Wie viel ist noch offen? Für die Mahlzeit (Tagesziel × Anteil der Mahlzeit minus schon Gegessenes) und
 * für den ganzen Tag. Nie unter 0, auf 10 kcal gerundet. slots: [{ id, anteil }], eintraege: des Tages.
 */
export function offeneKcal({ zielKcal, slots, slot, eintraege }) {
  const kcal = (liste) => liste.reduce((s, e) => s + ((e.je100?.kcal ?? 0) * (e.gramm ?? 0)) / 100, 0);
  const runde = (x) => Math.max(0, Math.round(x / 10) * 10);
  const anteil = slots.find((s) => s.id === slot)?.anteil ?? 0;
  return { mahlzeit: runde(zielKcal * anteil - kcal(eintraege.filter((e) => e.slot === slot))), tag: runde(zielKcal - kcal(eintraege)) };
}
