// Zutaten: Kategorien und Prüfung einer Eingabe. Reine Funktionen.

export const KATEGORIEN = [
  { id: 'obst', name: 'Obst' },
  { id: 'gemuese', name: 'Gemüse' },
  { id: 'getreide', name: 'Getreide und Brot' },
  { id: 'huelsenfruechte', name: 'Hülsenfrüchte' },
  { id: 'milch_ei', name: 'Milch und Ei' },
  { id: 'fleisch_fisch', name: 'Fleisch und Fisch' },
  { id: 'nuesse_samen', name: 'Nüsse und Samen' },
  { id: 'oele_fette', name: 'Öle und Fette' },
  { id: 'suesses', name: 'Süßes' },
  { id: 'getraenke', name: 'Getränke' },
  { id: 'sonstiges', name: 'Sonstiges' },
];

export const kategorieName = (id) => KATEGORIEN.find((k) => k.id === id)?.name ?? 'Sonstiges';

/** Woher eine Zutat stammt, als Text für die Oberfläche */
export const QUELLEN = {
  usda: 'USDA FoodData Central',
  richtwert: 'Richtwert, mit der Packung abgleichen',
  eigen: 'Selbst angelegt',
  off: 'Open Food Facts',
};

/** Felder des Formulars "Eigene Zutat" in Anzeige-Reihenfolge */
export const FORMULAR_FELDER = ['kcal', 'protein', 'kh', 'zucker', 'fett', 'gesFett', 'ballaststoffe', 'salz'];

/** "12,5" → 12.5; leer → null; Unsinn → NaN */
export function parseZahl(text) {
  if (typeof text === 'number') return text;
  const sauber = String(text ?? '').trim().replace(',', '.');
  if (sauber === '') return null;
  return /^-?\d+(\.\d+)?$/.test(sauber) ? Number(sauber) : NaN;
}

/**
 * Eingabe aus dem Formular prüfen.
 * eingabe: { name, marke, kategorie, portionName, portionGramm, je100: { kcal: '52', ... } }
 * Liefert { ok, fehler: { feld: text }, zutat } – zutat ohne id, die vergibt der Speicher.
 */
export function pruefeZutat(eingabe) {
  const fehler = {};
  const name = String(eingabe.name ?? '').trim();
  if (!name) fehler.name = 'Gib der Zutat einen Namen.';
  else if (name.length > 80) fehler.name = 'Höchstens 80 Zeichen.';

  const je100 = {};
  for (const id of FORMULAR_FELDER) {
    const wert = parseZahl(eingabe.je100?.[id]);
    if (wert === null) continue;
    if (Number.isNaN(wert) || wert < 0) fehler[id] = 'Nur Zahlen ab 0.';
    else if (id === 'kcal' ? wert > 900 : wert > 100) fehler[id] = id === 'kcal' ? 'Höchstens 900 kcal je 100 g.' : 'Höchstens 100 g je 100 g.';
    else je100[id] = wert;
  }
  if (je100.kcal === undefined && !fehler.kcal) fehler.kcal = 'Die Energie fehlt.';
  if (je100.zucker > je100.kh) fehler.zucker = 'Mehr Zucker als Kohlenhydrate geht nicht.';
  if (je100.gesFett > je100.fett) fehler.gesFett = 'Mehr gesättigtes Fett als Fett geht nicht.';
  const masse = (je100.protein ?? 0) + (je100.kh ?? 0) + (je100.fett ?? 0) + (je100.ballaststoffe ?? 0);
  if (masse > 100.5) fehler.summe = 'Eiweiß, Kohlenhydrate, Fett und Ballaststoffe ergeben zusammen mehr als 100 g.';

  const portionen = [];
  const gramm = parseZahl(eingabe.portionGramm);
  if (gramm !== null) {
    if (Number.isNaN(gramm) || gramm <= 0 || gramm > 5000) fehler.portionGramm = 'Gramm zwischen 1 und 5000.';
    else portionen.push({ name: String(eingabe.portionName ?? '').trim() || 'Portion', gramm });
  }

  const kategorie = KATEGORIEN.some((k) => k.id === eingabe.kategorie) ? eingabe.kategorie : 'sonstiges';
  const marke = String(eingabe.marke ?? '').trim().slice(0, 60);
  const unvollstaendig = ['protein', 'kh', 'fett'].some((id) => je100[id] === undefined);
  const ok = Object.keys(fehler).length === 0;
  return {
    ok,
    fehler,
    zutat: ok ? { name, marke, kategorie, quelle: 'eigen', je100, portionen, unvollstaendig } : null,
  };
}

/** Menge in Gramm prüfen (Tagebuch-Eintrag) */
export function pruefeMenge(text) {
  const gramm = parseZahl(text);
  if (gramm === null) return { ok: false, fehler: 'Wie viel Gramm?' };
  if (Number.isNaN(gramm) || gramm <= 0) return { ok: false, fehler: 'Eine Zahl über 0.' };
  if (gramm > 5000) return { ok: false, fehler: 'Höchstens 5000 g je Eintrag.' };
  return { ok: true, gramm };
}
