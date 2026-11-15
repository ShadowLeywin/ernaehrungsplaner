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

// Getränke und Saucen füllen sonst das Budget auf („+ Cappuccino“). Erkannt am Namen: Menge in l/ml oder typische Wörter.
// Lieber einmal ein Getränk zu viel ausgeschlossen als ein Kaffee als „Mahlzeit“; im Zusammenstellen bleibt alles wählbar.
// Wortgrenzen über Buchstaben-Klassen statt \\b: \\b kennt kein „é“, sonst rutscht „Café Grande“ durch
const GETRAENK = /\d+([.,]\d+)?\s?(ml|l|cl)(?!\p{L})|(?<!\p{L})(latte|cappuccino|espresso|café|caffè|kaffee|coffee|macchiato|mocha|chai|tee|tea|cola|fanta|sprite|mezzo|wasser|water|schorle|saft|juice|shake|smoothie|frapp\p{L}*|kakao|bier|beer|heineken|red bull|lipton|limo\p{L}*|sauce|dip|ketchup|mayo\p{L}*|dressing)(?!\p{L})/iu;
// „KFC Salat ohne Dressing“ oder „Sundae mit Karamell-Sauce“ sind keine Saucen: Zusätze mit „ohne“/„mit“ zählen nicht
export const istGetraenkOderSauce = (name) => GETRAENK.test(String(name).replace(/\s(ohne|mit)\s.*$/i, ''));

/** Wonach sortiert wird. Neutral benannt: Elan bewertet nicht, es sortiert nach deiner Wahl. */
export const ZIELE_VORSCHLAG = [
  { id: 'eiweiss', name: 'Viel Eiweiß' },
  { id: 'mager', name: 'Mager' },
  { id: 'satt', name: 'Budget voll' },
];

const wert = (g, w) => (typeof g[w] === 'number' ? g[w] : 0);

/**
 * Kombinationen aus 1 bis maxTeile Gerichten eines Restaurants (jedes Gericht höchstens einmal), die ins
 * Budget passen und es zu mindestens untergrenze (Anteil) nutzen. Sortiert nach ziel, dann näher am Budget.
 * Ergebnis: [{ ids, gerichte, kcal, protein, kh, fett }], höchstens anzahl Stück, ohne Kombinationen, die nur
 * eine schlechtere Obermenge einer besseren sind.
 * Durchprobieren findet sicher das Beste; nach kcal sortiert bricht jede Schleife ab, sobald das Budget gesprengt ist.
 */
export function vorschlaege(gerichte, { restaurant, budget, ziel = 'eiweiss', maxTeile = 3, anzahl = 5, untergrenze = 0.6, fruehstueck = true }) {
  if (!(budget > 0)) return [];
  // Nach kcal aufsteigend: Sobald eine Summe das Budget sprengt, sind alle weiteren in der Schleife zu groß (früher Abbruch)
  const auswahl = gerichte.filter((g) => g.restaurant === restaurant && g.kcal > 0 && g.kcal <= budget && !istGetraenkOderSauce(g.name)
    && (fruehstueck || !istFruehstueck(g.name))).sort((a, b) => a.kcal - b.kcal);
  const n = auswahl.length;
  const kcal = auswahl.map((g) => g.kcal);
  const werte = auswahl.map((g) => WERTE.map((w) => wert(g, w))); // [kcal, protein, kh, fett]
  // „Chicken Fajita (Footlong)“ und „Chicken Fajita (Salat)“ sind dasselbe Gericht: höchstens eine Form je Vorschlag
  const grund = auswahl.map((g) => g.name.replace(/\s*\(.*\)\s*$/, '').toLocaleLowerCase('de'));
  const punkte = {
    eiweiss: (s) => -s[1],
    // Eiweiß minus Fett, Gramm für Gramm: belohnt mageres Eiweiß, nicht Süßes mit wenig Fett
    mager: (s) => -(s[1] - s[3]),
    satt: (s) => budget - s[0],
  }[ziel] ?? ((s) => -s[1]);
  const min = budget * untergrenze;
  // Kompakt sammeln (Indizes und Summen), Objekte erst für die Besten bauen: spart Speicher bei vielen Treffern
  const treffer = [];
  const merke = (ids) => {
    const s = [0, 0, 0, 0];
    for (const i of ids) for (let w = 0; w < 4; w += 1) s[w] += werte[i][w];
    if (s[0] < min) return;
    treffer.push({ ids, s, p: punkte(s) });
  };
  for (let i = 0; i < n; i += 1) {
    merke([i]);
    if (maxTeile < 2) continue;
    for (let j = i + 1; j < n; j += 1) {
      if (kcal[i] + kcal[j] > budget) break;
      if (grund[j] === grund[i]) continue;
      merke([i, j]);
      if (maxTeile < 3) continue;
      for (let k = j + 1; k < n; k += 1) {
        if (kcal[i] + kcal[j] + kcal[k] > budget) break;
        if (grund[k] === grund[i] || grund[k] === grund[j]) continue;
        merke([i, j, k]);
      }
    }
  }
  // Gleichstand: weniger Teile zuerst (eine Cola Zero dazu bringt nichts), dann näher am Budget, dann mehr Eiweiß
  treffer.sort((a, b) => a.p - b.p || a.ids.length - b.ids.length || (budget - a.s[0]) - (budget - b.s[0]) || b.s[1] - a.s[1]);
  // Abwechslung: kein Vorschlag, der nur ein früherer plus ein Extra ist (oder umgekehrt)
  const gewaehlt = [];
  for (const t of treffer) {
    if (gewaehlt.some((x) => x.ids.every((id) => t.ids.includes(id)) || t.ids.every((id) => x.ids.includes(id)))) continue;
    gewaehlt.push(t);
    if (gewaehlt.length >= anzahl) break;
  }
  return gewaehlt.map((t) => ({
    ids: t.ids.map((i) => auswahl[i].id), gerichte: t.ids.map((i) => auswahl[i]),
    kcal: t.s[0], protein: t.s[1], kh: t.s[2], fett: t.s[3],
  }));
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

/* ---------- Mitgelieferte Ketten-Listen ---------- */

/**
 * Mitgelieferte Liste (data/unterwegs-ketten.json) in die eigene einmischen, wenn sie neu ist oder einen neueren
 * Stand hat. Gleiche Gerichte (Restaurant + Name) übernimmt die Liste mit neuen Werten; eigene bleiben unberührt.
 * Ergebnis { gerichte, stand, geaendert }. Wer ein Ketten-Gericht löscht, bekommt es erst mit dem nächsten Stand zurück.
 */
export function mischeKetten(eigene, paket, gespeicherterStand) {
  const datei = leseUnterwegsDatei(paket);
  if (!datei.ok || !datei.stand || (gespeicherterStand && gespeicherterStand >= datei.stand)) return { gerichte: eigene, stand: gespeicherterStand ?? null, geaendert: false };
  return { gerichte: fuegeZusammen(eigene, datei.gerichte), stand: datei.stand, geaendert: true };
}

// Frühstück gibt es meist nur vormittags: solche Artikel nur für Frühstück und Morgensnack vorschlagen
const FRUEHSTUECK = /mcmuffin|pancake|rührei|morning|mcgriddle|breakfast|frühstück|king toasty/i;
export const istFruehstueck = (name) => FRUEHSTUECK.test(name);
export const FRUEHSTUECKS_SLOTS = ['fruehstueck', 'morgensnack'];
