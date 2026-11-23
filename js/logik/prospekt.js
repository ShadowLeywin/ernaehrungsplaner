// Prospekte: Angebote je Markt aus einer Datei (Format "elan-angebote" Version 2, docs/ANGEBOTE-FORMAT.md).
// Reine Funktionen. Elan ruft keine Prospekte ab (Léons Entscheidung E4.1 vom 23.11.2026): Die Datei pflegt man selbst
// oder sie kommt später aus einer Quelle, deren Bedingungen das erlauben. Prospektbilder speichert Elan nie.

import { giltAm, leseAngebotsDatei, pruefeAngebot } from './angebote.js';
import { findeZutat } from './import.js';
import { normalisiere } from './suche.js';
import { KATEGORIEN } from './zutat.js';

export const FORMAT = 'elan-angebote';
export const VERSION = 2;
const KATEGORIE_IDS = new Set(KATEGORIEN.map((k) => k.id));

/**
 * Datei der Version 2 lesen. Jede Zeile ist ein Artikel wie im Prospekt; "zutat" ist freiwillig und verknüpft den Artikel
 * mit einer Zutat (nur bei ganzen Wörtern), damit er als Angebot in der Einkaufsliste erscheint.
 * Liefert { ok, fehler, prospekt: { quelle, stand, links, artikel }, angebote (für den Speicher), ohneTreffer, ungueltig }.
 */
export function leseProspektDatei(roh, zutaten) {
  if (!roh || typeof roh !== 'object' || Array.isArray(roh)) return { ok: false, fehler: ['Die Datei enthält keine Angebote.'] };
  if (roh.format !== FORMAT || roh.version !== VERSION) return { ok: false, fehler: [`Erwartet wird "format": "${FORMAT}" mit "version": ${VERSION}.`] };
  if (!Array.isArray(roh.angebote)) return { ok: false, fehler: ['Das Feld "angebote" fehlt oder ist keine Liste.'] };
  const nachId = new Map(zutaten.map((z) => [z.id, z]));
  const artikel = [];
  const angebote = [];
  const ohneTreffer = [];
  let ungueltig = 0;
  roh.angebote.forEach((zeile, i) => {
    const pruefung = pruefeAngebot({ ...zeile, preis: typeof zeile?.preis === 'number' ? String(zeile.preis) : zeile?.preis });
    const name = String(zeile?.artikel ?? '').trim().slice(0, 80);
    if (!pruefung.ok || !name) { ungueltig += 1; return; }
    const eintrag = { id: `p${i}`, ...pruefung.angebot, artikel: name, kategorie: KATEGORIE_IDS.has(zeile.kategorie) ? zeile.kategorie : 'sonstiges' };
    const grundpreis = String(zeile.grundpreis ?? '').trim().slice(0, 30);
    if (grundpreis) eintrag.grundpreis = grundpreis;
    const zutatName = String(zeile.zutat ?? '').trim();
    if (zutatName) {
      const zutat = nachId.get(zutatName) ?? findeZutat(zutatName, zutaten);
      if (zutat) {
        Object.assign(eintrag, { zutatId: zutat.id, zutatName: zutat.name });
        angebote.push({ ...pruefung.angebot, zutatId: zutat.id, zutatName: zutat.name, quelle: 'datei', notiz: name });
      } else ohneTreffer.push(zutatName);
    }
    artikel.push(eintrag);
  });
  const links = Array.isArray(roh.links) ? roh.links.filter((l) => l && typeof l.kette === 'string' && /^https:\/\//.test(l.url ?? '')).map((l) => ({ kette: l.kette.slice(0, 40), url: l.url.slice(0, 300), art: l.art === 'prospekt' ? 'prospekt' : 'startseite' })) : [];
  const prospekt = { quelle: String(roh.quelle ?? '').slice(0, 200), stand: String(roh.stand ?? '').slice(0, 16), links, artikel };
  return { ok: true, fehler: [], prospekt, angebote, ohneTreffer, ungueltig };
}

/** Version 1 (nur Zutat, Markt, Preis) oder Version 2 (Prospekt) erkennen und lesen. Version 1 ergibt einen Prospekt ohne Artikelnamen. */
export function leseAngebotsDateiBeliebig(roh, zutaten) {
  if (roh && roh.format === FORMAT) return leseProspektDatei(roh, zutaten);
  const v1 = leseAngebotsDatei(roh, zutaten);
  if (!v1.ok) return v1;
  return { ...v1, prospekt: null };
}

/** Link zur Kette eines Markts: aus der Datei, sonst aus der mitgelieferten Liste. Nur ganze Wörter, wie bei Angeboten. */
export function linkFuer(markt, ...listen) {
  const namen = [markt.marke, markt.name, markt.markt].map(normalisiere).filter(Boolean);
  for (const liste of listen) {
    for (const l of liste ?? []) {
      const kette = normalisiere(l.kette);
      if (namen.some((n) => n === kette || n.startsWith(`${kette} `) || kette.startsWith(`${n} `))) return l;
    }
  }
  return null;
}

/**
 * Artikel für die Prospekt-Seite: nur die heute gültigen, je Markt und darin je Kategorie, günstigste zuerst.
 * aufListe: Set von Zutat-Kennungen auf der aktuellen Einkaufsliste, damit passende Angebote markiert werden.
 * Liefert [{ markt, kategorien: [{ kategorie, artikel: [{ ...artikel, aufListe }] }], anzahl }].
 */
export function prospektSeiten(artikel, tag, aufListe = new Set()) {
  const rang = new Map(KATEGORIEN.map((k, i) => [k.id, i]));
  const jeMarkt = new Map();
  for (const a of artikel.filter((x) => giltAm(x, tag))) {
    if (!jeMarkt.has(a.markt)) jeMarkt.set(a.markt, []);
    jeMarkt.get(a.markt).push({ ...a, aufListe: Boolean(a.zutatId && aufListe.has(a.zutatId)) });
  }
  return [...jeMarkt.entries()].sort(([a], [b]) => a.localeCompare(b, 'de')).map(([markt, liste]) => {
    const kategorien = new Map();
    for (const a of liste) {
      if (!kategorien.has(a.kategorie)) kategorien.set(a.kategorie, []);
      kategorien.get(a.kategorie).push(a);
    }
    return {
      markt,
      anzahl: liste.length,
      kategorien: [...kategorien.entries()].sort(([a], [b]) => (rang.get(a) ?? 99) - (rang.get(b) ?? 99))
        .map(([kategorie, x]) => ({ kategorie, artikel: x.sort((p, q) => Number(q.aufListe) - Number(p.aufListe) || p.preis - q.preis) })),
    };
  });
}
