// Open Food Facts: Adressen bauen und Antworten in unser Zutaten-Format übersetzen.
// Reine Funktionen; der eigentliche Netzabruf steht in js/off-abruf.js.

const BASIS = 'https://world.openfoodfacts.org';
const FELDER = 'code,product_name,product_name_de,brands,quantity,serving_quantity,nutriments';

export const istBarcode = (text) => /^\d{8,14}$/.test(String(text ?? '').trim());

export function offSuchUrl(begriff, anzahl = 20) {
  const p = new URLSearchParams({
    search_terms: begriff,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(anzahl),
    fields: FELDER,
    lc: 'de',
    cc: 'de',
  });
  return `${BASIS}/cgi/search.pl?${p}`;
}

export const offProduktUrl = (code) => `${BASIS}/api/v2/product/${encodeURIComponent(String(code).trim())}.json?fields=${FELDER}`;

const zahl = (wert) => {
  const n = typeof wert === 'string' ? Number(wert.replace(',', '.')) : wert;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : undefined;
};

const runde = (n, stellen = 1) => Math.round(n * 10 ** stellen) / 10 ** stellen;

/**
 * Ein Produkt aus Open Food Facts in eine Zutat übersetzen.
 * Liefert null, wenn Name oder Energie fehlen (ohne beides ist der Eintrag nutzlos).
 */
export function ausOffProdukt(produkt) {
  if (!produkt || !produkt.code) return null;
  const name = String(produkt.product_name_de || produkt.product_name || '').trim();
  const n = produkt.nutriments ?? {};

  let kcal = zahl(n['energy-kcal_100g']);
  if (kcal === undefined) {
    const kj = zahl(n['energy-kj_100g']) ?? zahl(n.energy_100g);
    if (kj !== undefined) kcal = kj / 4.184;
  }
  if (!name || kcal === undefined) return null;

  const je100 = { kcal: runde(kcal, 0) };
  const zuordnung = {
    protein: 'proteins_100g',
    kh: 'carbohydrates_100g',
    zucker: 'sugars_100g',
    fett: 'fat_100g',
    gesFett: 'saturated-fat_100g',
    ballaststoffe: 'fiber_100g',
    salz: 'salt_100g',
  };
  for (const [id, feld] of Object.entries(zuordnung)) {
    const wert = zahl(n[feld]);
    if (wert !== undefined) je100[id] = runde(wert, 2);
  }
  if (je100.salz === undefined && zahl(n.sodium_100g) !== undefined) je100.salz = runde(zahl(n.sodium_100g) * 2.5, 2);

  const portionen = [];
  const portion = zahl(produkt.serving_quantity);
  if (portion > 0 && portion <= 5000) portionen.push({ name: 'Portion', gramm: runde(portion, 0) });

  return {
    id: `off:${produkt.code}`,
    name: name.slice(0, 80),
    marke: String(produkt.brands ?? '').split(',')[0].trim().slice(0, 60),
    kategorie: 'sonstiges',
    quelle: 'off',
    quelleId: String(produkt.code),
    je100,
    portionen,
    // Open Food Facts wird von Freiwilligen gepflegt; fehlende Makros kennzeichnen wir
    unvollstaendig: ['protein', 'kh', 'fett'].some((id) => je100[id] === undefined),
  };
}

/** Antwort der Suche → Liste von Zutaten (unbrauchbare Produkte fallen weg) */
export function ausOffSuche(antwort) {
  const gesehen = new Set();
  const liste = [];
  for (const produkt of antwort?.products ?? []) {
    const zutat = ausOffProdukt(produkt);
    if (!zutat || gesehen.has(zutat.id)) continue;
    gesehen.add(zutat.id);
    liste.push(zutat);
  }
  return liste;
}
