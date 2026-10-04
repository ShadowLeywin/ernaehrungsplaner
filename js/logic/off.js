// Open Food Facts: Produkt-JSON → Lebensmittel der App (reine Funktionen).
// Abgefragt wird nur der Barcode bzw. Suchbegriff – keine persönlichen Daten.

export const OFF_FELDER = 'code,product_name,product_name_de,brands,nutriments,serving_quantity,labels_tags,ingredients_analysis_tags,allergens_tags,categories_tags';

// OFF-Nährstoffschlüssel (je 100 g) → App-Schlüssel und Umrechnungsfaktor in die App-Einheit
const ZUORDNUNG = {
  'energy-kcal_100g': ['kcal', 1],
  proteins_100g: ['protein', 1],
  carbohydrates_100g: ['kh', 1],
  sugars_100g: ['zucker', 1],
  fat_100g: ['fett', 1],
  'saturated-fat_100g': ['gesFett', 1],
  fiber_100g: ['ballaststoffe', 1],
  'omega-3-fat_100g': ['omega3', 1],
  'vitamin-a_100g': ['vitA', 1e6], // g → µg
  'vitamin-b1_100g': ['vitB1', 1e3],
  'vitamin-b2_100g': ['vitB2', 1e3],
  'vitamin-pp_100g': ['vitB3', 1e3],
  'vitamin-b6_100g': ['vitB6', 1e3],
  'vitamin-b9_100g': ['folat', 1e6],
  'vitamin-b12_100g': ['vitB12', 1e6],
  'vitamin-c_100g': ['vitC', 1e3],
  'vitamin-d_100g': ['vitD', 1e6],
  'vitamin-e_100g': ['vitE', 1e3],
  'vitamin-k_100g': ['vitK', 1e6],
  calcium_100g: ['calcium', 1e3],
  iron_100g: ['eisen', 1e3],
  magnesium_100g: ['magnesium', 1e3],
  zinc_100g: ['zink', 1e3],
  potassium_100g: ['kalium', 1e3],
  sodium_100g: ['natrium', 1e3],
  phosphorus_100g: ['phosphor', 1e3],
  iodine_100g: ['jod', 1e6],
  selenium_100g: ['selen', 1e6],
};

export const istBarcode = (text) => /^\d{8,14}$/.test(String(text).trim());

/** OFF-Produkt in ein App-Lebensmittel umwandeln; null, wenn Energie fehlt. */
export function offZuLebensmittel(p) {
  const n = p?.nutriments ?? {};
  const je100g = {};
  for (const [schluessel, [ziel, faktor]] of Object.entries(ZUORDNUNG)) {
    const wert = Number(n[schluessel]);
    if (Number.isFinite(wert)) je100g[ziel] = Math.round(wert * faktor * 1000) / 1000;
  }
  // Energie notfalls aus kJ
  if (je100g.kcal == null && Number.isFinite(Number(n.energy_100g))) je100g.kcal = Math.round(Number(n.energy_100g) / 4.184);
  // Natrium fehlt, Salz vorhanden: Salz (g) × 400 = Natrium (mg)
  if (je100g.natrium == null && Number.isFinite(Number(n.salt_100g))) je100g.natrium = Math.round(Number(n.salt_100g) * 400);
  if (je100g.kcal == null) return null;
  for (const k of ['protein', 'kh', 'fett']) je100g[k] ??= 0;

  const tags = (feld) => new Set(p[feld] ?? []);
  const analyse = tags('ingredients_analysis_tags');
  const labels = tags('labels_tags');
  const allergene = tags('allergens_tags');
  const vegan = analyse.has('en:vegan') || labels.has('en:vegan');
  const vegetarisch = vegan || analyse.has('en:vegetarian') || labels.has('en:vegetarian');
  const name = (p.product_name_de || p.product_name || '').trim() || `Produkt ${p.code}`;
  return {
    id: `off:${p.code}`,
    name: name.slice(0, 80),
    marke: (p.brands ?? '').split(',')[0].trim().slice(0, 60) || null,
    kategorie: 'eigen',
    quelle: 'off',
    barcode: String(p.code),
    stueckG: Number(p.serving_quantity) > 0 ? Math.round(Number(p.serving_quantity)) : undefined,
    je100g,
    unvollstaendig: true,
    flags: {
      fleisch: false,
      fisch: false,
      // Unbekannt = nicht als tierisch markieren, aber auch nicht als vegan versprechen
      tierisch: !vegan && (allergene.has('en:milk') || allergene.has('en:eggs') || !vegetarisch && (allergene.has('en:fish') || allergene.has('en:crustaceans'))),
      laktose: allergene.has('en:milk'),
      gluten: allergene.has('en:gluten'),
      nuesse: allergene.has('en:nuts') || allergene.has('en:peanuts'),
      unsicher: !vegan && !vegetarisch,
    },
  };
}

/** Eigenes Lebensmittel aus manueller Eingabe (Werte je 100 g). */
export function eigenesLebensmittel(id, { name, marke, kcal, protein, kh, fett, zucker, ballaststoffe, salz, stueckG }) {
  const je100g = { kcal, protein: protein ?? 0, kh: kh ?? 0, fett: fett ?? 0 };
  if (zucker != null) je100g.zucker = zucker;
  if (ballaststoffe != null) je100g.ballaststoffe = ballaststoffe;
  if (salz != null) je100g.natrium = Math.round(salz * 400);
  return {
    id: `eigen:${id}`, name: name.trim().slice(0, 80), marke: marke?.trim() || null, kategorie: 'eigen', quelle: 'eigen',
    stueckG: stueckG > 0 ? stueckG : undefined, je100g, unvollstaendig: true,
  };
}
