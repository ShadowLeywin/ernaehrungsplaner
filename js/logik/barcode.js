// Barcodes (EAN/GTIN) für den Scanner. Reine Funktionen.
// Ein Scan liefert manchmal Leerzeichen oder einen falsch gelesenen Strich; die Prüfziffer fängt das ab,
// bevor Elan Open Food Facts fragt.

/** Ziffern aus dem Scan; null, wenn es kein Strichcode für Lebensmittel sein kann (8 bis 14 Ziffern) */
export function normalisiereBarcode(roh) {
  const ziffern = String(roh ?? '').replace(/[\s-]/g, '');
  return /^\d{8,14}$/.test(ziffern) ? ziffern : null;
}

/** Prüfziffer nach GS1 (EAN-8, EAN-13, UPC-A, GTIN-14): von rechts abwechselnd ×3 und ×1 */
export function pruefzifferStimmt(code) {
  if (!/^\d{8,14}$/.test(code)) return false;
  const ziffern = [...code].map(Number);
  const pruef = ziffern.pop();
  const summe = ziffern.reverse().reduce((s, z, i) => s + z * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (summe % 10)) % 10 === pruef;
}

/** Schon gespeicherte Zutat zu diesem Barcode (aus Open Food Facts übernommen oder selbst mit Barcode angelegt) */
export function zutatZumBarcode(zutaten, code) {
  return zutaten.find((z) => z.id === `off:${code}` || String(z.quelleId ?? '') === code || String(z.barcode ?? '') === code) ?? null;
}
