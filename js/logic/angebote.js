// Angebote der Märkte aus angebote.json (vom Cowork-Agenten erzeugt) – prüfen, filtern, Lebensmitteln zuordnen.
// Format (maßgeblich, schema_version 1): { schema_version, erstellt_am, kalenderwoche, hinweis,
//   maerkte: [{ id, haendler, ort, quelle, prospekte: [...], angebote: [{ produkt, marke, preis, preis_ab,
//   streichpreis, rabatt_prozent, kategorie, gueltig_von, gueltig_bis }] }] }
import { trefferWert } from './memo.js';
import { normalisiere } from '../lebensmittel.js';

export const ANGEBOTE_SCHEMA = 1;
export const ESSBAR = new Set(['lebensmittel', 'getraenke']);
export const KATEGORIE_NAMEN = { lebensmittel: 'Lebensmittel', getraenke: 'Getränke', drogerie: 'Drogerie', haushalt_nonfood: 'Haushalt' };

const istDatum = (x) => x == null || /^\d{4}-\d{2}-\d{2}$/.test(x);

/** Datei prüfen. Liefert { daten } oder { fehler }. Fehlerhafte einzelne Angebote werden übersprungen. */
export function pruefeAngebote(text) {
  let roh;
  try { roh = typeof text === 'string' ? JSON.parse(text) : text; } catch { return { fehler: 'Die Datei ist kein gültiges JSON.' }; }
  if (roh?.schema_version !== ANGEBOTE_SCHEMA) return { fehler: `Unbekannte schema_version (erwartet ${ANGEBOTE_SCHEMA}).` };
  if (!Array.isArray(roh.maerkte)) return { fehler: 'Keine Märkte enthalten.' };
  const maerkte = roh.maerkte
    .filter((m) => typeof m?.id === 'string' && typeof m.haendler === 'string' && Array.isArray(m.angebote))
    .map((m) => ({
      id: m.id.slice(0, 60),
      haendler: m.haendler.slice(0, 80),
      ort: String(m.ort ?? '').slice(0, 80),
      angebote: m.angebote
        .filter((a) => typeof a?.produkt === 'string' && (a.preis == null || typeof a.preis === 'number') && istDatum(a.gueltig_von) && istDatum(a.gueltig_bis))
        .map((a) => ({
          produkt: a.produkt.slice(0, 120),
          marke: typeof a.marke === 'string' ? a.marke.slice(0, 80) : null,
          preis: a.preis ?? null,
          preisAb: Boolean(a.preis_ab),
          streichpreis: typeof a.streichpreis === 'number' ? a.streichpreis : null,
          rabatt: typeof a.rabatt_prozent === 'number' ? a.rabatt_prozent : null,
          kategorie: typeof a.kategorie === 'string' ? a.kategorie : 'lebensmittel',
          von: a.gueltig_von ?? null,
          bis: a.gueltig_bis ?? null,
        })),
    }));
  if (!maerkte.length) return { fehler: 'Keine gültigen Märkte enthalten.' };
  return { daten: { kalenderwoche: roh.kalenderwoche ?? null, erstelltAm: roh.erstellt_am ?? null, hinweis: roh.hinweis ?? '', maerkte } };
}

/**
 * Gültige Angebote als flache Liste. optionen: { heute: 'YYYY-MM-DD', aktiv: Set(marktIds)|null, nurEssbar }
 */
export function aktuelleAngebote(daten, { heute, aktiv = null, nurEssbar = true } = {}) {
  if (!daten) return [];
  return daten.maerkte
    .filter((m) => !aktiv || aktiv.has(m.id))
    .flatMap((m) => m.angebote.map((a) => ({ ...a, marktId: m.id, markt: `${m.haendler}${m.ort ? ` ${m.ort}` : ''}` })))
    .filter((a) => (!heute || ((!a.von || a.von <= heute) && (!a.bis || a.bis >= heute))))
    .filter((a) => !nurEssbar || ESSBAR.has(a.kategorie))
    .sort((a, b) => (b.rabatt ?? 0) - (a.rabatt ?? 0));
}

/** Passendes Lebensmittel für ein Angebot (nur sichere Treffer). */
export function zugeordnetesLebensmittel(angebot, lebensmittel) {
  const woerter = normalisiere(angebot.produkt).split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  let bester = null;
  let besterWert = 2.9;
  for (const lm of lebensmittel) {
    if (lm.kategorie === 'rezept') continue;
    const wert = trefferWert(lm.name, woerter);
    if (wert > besterWert) { bester = lm; besterWert = wert; }
  }
  return bester;
}

/** Map lebensmittelId → [Angebote] für schnelle Hinweise in Einkaufsliste und Wochenplan. */
export function angeboteJeLebensmittel(angebote, lebensmittel) {
  const ergebnis = new Map();
  for (const a of angebote) {
    const lm = zugeordnetesLebensmittel(a, lebensmittel);
    if (!lm) continue;
    ergebnis.set(lm.id, [...(ergebnis.get(lm.id) ?? []), a]);
  }
  return ergebnis;
}

export function preisText(a) {
  const euro = (x) => `${x.toFixed(2).replace('.', ',')} €`;
  if (a.preis == null) return '';
  return `${a.preisAb ? 'ab ' : ''}${euro(a.preis)}${a.streichpreis ? ` statt ${euro(a.streichpreis)}` : ''}`;
}
