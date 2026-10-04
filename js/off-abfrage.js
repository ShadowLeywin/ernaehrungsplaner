// Abfragen bei Open Food Facts (nur auf Knopfdruck, nur Barcode oder Suchbegriff) und Speichern eigener Lebensmittel.
import { lese, schreibe } from './db.js';
import { lebensmittelGeaendert } from './lebensmittel.js';
import { offZuLebensmittel, OFF_FELDER } from './logic/off.js';

const BASIS = 'https://world.openfoodfacts.org';

export async function produktPerBarcode(code) {
  const antwort = await fetch(`${BASIS}/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FELDER}`, { credentials: 'omit' });
  if (antwort.status === 404) return null;
  if (!antwort.ok) throw new Error(`Open Food Facts antwortet nicht (${antwort.status}).`);
  const daten = await antwort.json();
  return daten.status === 1 ? offZuLebensmittel(daten.product) : null;
}

export async function sucheOnline(begriff) {
  const url = `${BASIS}/cgi/search.pl?search_terms=${encodeURIComponent(begriff)}&search_simple=1&action=process&json=1&page_size=24&fields=${OFF_FELDER}&lc=de&cc=de`;
  const antwort = await fetch(url, { credentials: 'omit' });
  if (!antwort.ok) throw new Error(`Suche fehlgeschlagen (${antwort.status}).`);
  const daten = await antwort.json();
  return (daten.products ?? []).map(offZuLebensmittel).filter(Boolean);
}

export async function holeEigeneLebensmittel() {
  return (await lese('einstellungen', 'eigeneLebensmittel')) ?? [];
}

/** Speichert (oder ersetzt) ein eigenes Lebensmittel. */
export async function speichereEigenesLebensmittel(lm) {
  const liste = await holeEigeneLebensmittel();
  await schreibe('einstellungen', 'eigeneLebensmittel', [...liste.filter((l) => l.id !== lm.id), lm]);
  lebensmittelGeaendert();
}

export async function loescheEigenesLebensmittel(id) {
  const liste = await holeEigeneLebensmittel();
  await schreibe('einstellungen', 'eigeneLebensmittel', liste.filter((l) => l.id !== id));
  lebensmittelGeaendert();
}
