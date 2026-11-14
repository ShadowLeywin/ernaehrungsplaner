// Angebote: ein Preis für eine Zutat in einem Markt, begrenzt gültig. Reine Funktionen.
// Angebote kommen von Hand oder aus einer selbst gepflegten Datei, nicht aus fremden Diensten.

import { istGueltig as istDatum } from './datum.js';
import { findeZutat } from './import.js';
import { parseZahl } from './zutat.js';

export const DATEI_VERSION = 1;

const euro = (preis) => `${preis.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const kurzDatum = (iso) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;

/** Eingabe prüfen: { markt, preis, menge, gueltigVon, gueltigBis, notiz }. Liefert { ok, fehler, angebot }. */
export function pruefeAngebot(eingabe) {
  const fehler = {};
  const markt = String(eingabe.markt ?? '').trim();
  if (!markt) fehler.markt = 'In welchem Markt?';
  else if (markt.length > 40) fehler.markt = 'Höchstens 40 Zeichen.';
  const preis = parseZahl(eingabe.preis);
  if (preis === null || Number.isNaN(preis) || preis <= 0 || preis > 1000) fehler.preis = 'Preis in Euro, zum Beispiel 1,99.';
  const datum = (id) => {
    const wert = String(eingabe[id] ?? '').trim();
    if (!wert) return undefined;
    if (!istDatum(wert)) { fehler[id] = 'Kein gültiges Datum.'; return undefined; }
    return wert;
  };
  const gueltigVon = datum('gueltigVon');
  const gueltigBis = datum('gueltigBis');
  if (gueltigVon && gueltigBis && gueltigVon > gueltigBis) fehler.gueltigBis = 'Das Ende liegt vor dem Anfang.';
  const ok = Object.keys(fehler).length === 0;
  if (!ok) return { ok, fehler, angebot: null };
  const angebot = { markt, preis: Math.round(preis * 100) / 100 };
  const menge = String(eingabe.menge ?? '').trim().slice(0, 30);
  if (menge) angebot.menge = menge;
  if (gueltigVon) angebot.gueltigVon = gueltigVon;
  if (gueltigBis) angebot.gueltigBis = gueltigBis;
  const notiz = String(eingabe.notiz ?? '').trim().slice(0, 120);
  if (notiz) angebot.notiz = notiz;
  return { ok, fehler, angebot };
}

/** Gilt das Angebot an diesem Tag? Ohne Datumsangabe gilt es, bis man es löscht. */
export function giltAm(angebot, tag) {
  return (!angebot.gueltigVon || angebot.gueltigVon <= tag) && (!angebot.gueltigBis || angebot.gueltigBis >= tag);
}

export const istAbgelaufen = (angebot, tag) => Boolean(angebot.gueltigBis) && angebot.gueltigBis < tag;

/** Aktuelle Angebote je Zutat, das günstigste zuerst: Map zutatId → [angebot] */
export function aktuelleJeZutat(angebote, tag) {
  const karte = new Map();
  for (const a of angebote) {
    if (!giltAm(a, tag)) continue;
    if (!karte.has(a.zutatId)) karte.set(a.zutatId, []);
    karte.get(a.zutatId).push(a);
  }
  for (const liste of karte.values()) liste.sort((x, y) => x.preis - y.preis);
  return karte;
}

/** "Testmarkt: 1,99 € für 500 g, bis 20.11." */
export function angebotText(a) {
  const teile = [`${a.markt}: ${euro(a.preis)}${a.menge ? ` für ${a.menge}` : ''}`];
  if (a.gueltigVon && a.gueltigBis) teile.push(`${kurzDatum(a.gueltigVon)} bis ${kurzDatum(a.gueltigBis)}`);
  else if (a.gueltigBis) teile.push(`bis ${kurzDatum(a.gueltigBis)}`);
  else if (a.gueltigVon) teile.push(`ab ${kurzDatum(a.gueltigVon)}`);
  return teile.join(', ');
}

/**
 * Eine Angebotsdatei lesen (Format in docs/ANGEBOTE-FORMAT.md).
 * { "schemaVersion": 1, "angebote": [{ "zutat": "Apfel", "markt": "…", "preis": 1.99, "menge": "1 kg", "gueltigBis": "2026-11-21" }] }
 * "zutat" ist ein Name oder eine Kennung. Zugeordnet wird nur bei ganzen Wörtern.
 * Liefert { ok, fehler: [text], angebote: [mit zutatId und zutatName], ohneTreffer: [name], ungueltig: n }.
 */
export function leseAngebotsDatei(roh, zutaten) {
  if (!roh || typeof roh !== 'object' || Array.isArray(roh)) return { ok: false, fehler: ['Die Datei enthält keine Angebote.'] };
  if (roh.schemaVersion !== DATEI_VERSION) return { ok: false, fehler: [`Erwartet wird "schemaVersion": ${DATEI_VERSION}.`] };
  if (!Array.isArray(roh.angebote)) return { ok: false, fehler: ['Das Feld "angebote" fehlt oder ist keine Liste.'] };
  const nachId = new Map(zutaten.map((z) => [z.id, z]));
  const angebote = [];
  const ohneTreffer = [];
  let ungueltig = 0;
  for (const zeile of roh.angebote) {
    const pruefung = pruefeAngebot({ ...zeile, preis: typeof zeile?.preis === 'number' ? String(zeile.preis) : zeile?.preis });
    const name = String(zeile?.zutat ?? '').trim();
    if (!pruefung.ok || !name) { ungueltig += 1; continue; }
    const zutat = nachId.get(name) ?? findeZutat(name, zutaten);
    if (!zutat) { ohneTreffer.push(name); continue; }
    angebote.push({ ...pruefung.angebot, zutatId: zutat.id, zutatName: zutat.name, quelle: 'datei' });
  }
  return { ok: true, fehler: [], angebote, ohneTreffer, ungueltig };
}
