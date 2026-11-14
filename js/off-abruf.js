// Netzabruf bei Open Food Facts. Läuft nur, wenn der Nutzer ausdrücklich online sucht.
// Gesendet wird ausschließlich der Suchbegriff oder der Barcode, nie etwas aus dem Tagebuch.

import { ausOffProdukt, ausOffSuche, istBarcode, offProduktUrl, offSuchUrl } from './logik/off.js';
import { holeJson } from './plattform.js';

async function hole(url) {
  let antwort;
  try {
    antwort = await holeJson(url);
  } catch (fehler) {
    if (fehler.name === 'AbortError') throw new Error('Open Food Facts hat nicht rechtzeitig geantwortet.');
    throw new Error('Keine Verbindung zu Open Food Facts. Bist du online?');
  }
  if (antwort.status === 429) throw new Error('Open Food Facts bremst gerade (zu viele Anfragen). Warte eine Minute.');
  if (antwort.status === 404) return {};
  if (antwort.status < 200 || antwort.status >= 300) throw new Error(`Open Food Facts antwortet mit Fehler ${antwort.status}.`);
  return antwort.daten ?? {};
}

/** Suchbegriff oder Barcode → Liste von Zutaten (noch nicht gespeichert) */
export async function sucheOnline(begriff) {
  const text = String(begriff).trim();
  if (istBarcode(text)) {
    const antwort = await hole(offProduktUrl(text));
    const zutat = ausOffProdukt(antwort.product ? { code: text, ...antwort.product } : null);
    return zutat ? [zutat] : [];
  }
  return ausOffSuche(await hole(offSuchUrl(text)));
}
