// Preise der Einkaufsliste je Markt. Reine Funktionen.
// Vorrang: gültiges Angebot des Markts, dann ein selbst gemerkter Preis, sonst "unbekannt".
// Nichts wird geschätzt oder erfunden: Ohne Packungsgröße lässt sich kein Preis für eine Menge rechnen.

import { giltAm } from './angebote.js';
import { normalisiere } from './suche.js';
import { parseZahl } from './zutat.js';

export const euroText = (betrag) => `${betrag.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

const EINHEIT = { g: 1, gr: 1, gramm: 1, kg: 1000, ml: 1, cl: 10, l: 1000, liter: 1000 };

/**
 * Packungsgröße aus einem Text: "500 g", "1,5 kg", "6 x 1,5 l", "750ml".
 * Liter zählen wie Kilogramm (Dichte 1); das ist für Getränke und Milch nah genug und wird als geschaetzt markiert.
 * Liefert { gramm, geschaetzt } oder null, wenn keine Menge mit Einheit dasteht ("1 Stück", "Packung").
 */
export function packungAusText(text) {
  const m = /^(?:(\d+)\s*[x×]\s*)?(\d+(?:[.,]\d+)?)\s*(kg|gr|gramm|g|ml|cl|liter|l)\b/i.exec(String(text ?? '').trim());
  if (!m) return null;
  const anzahl = m[1] ? Number(m[1]) : 1;
  const einheit = m[3].toLowerCase();
  const gramm = Math.round(anzahl * Number(m[2].replace(',', '.')) * EINHEIT[einheit] * 10) / 10;
  if (!(gramm > 0)) return null;
  return { gramm, geschaetzt: ['ml', 'cl', 'l', 'liter'].includes(einheit) };
}

/**
 * Gehört ein Angebot zu diesem Markt? Über die Kennung, oder der Name des Angebots ist die Kette des Markts
 * ("Lidl" passt zu jeder Lidl-Filiale) oder beginnt mit ihr als ganzes Wort ("Lidl Burgau").
 */
export function passtZuMarkt(angebot, markt) {
  if (angebot.marktId) return angebot.marktId === markt.id;
  const name = normalisiere(angebot.markt);
  if (!name) return false;
  return [markt.marke, markt.name].map(normalisiere).filter(Boolean).some((k) => name === k || name.startsWith(`${k} `));
}

/** Eingabe eines gemerkten Preises prüfen: { preis, packung (Gramm) }. Liefert { ok, fehler, wert }. */
export function pruefePreis(eingabe) {
  const fehler = {};
  const preis = parseZahl(eingabe.preis);
  if (preis === null || Number.isNaN(preis) || preis <= 0 || preis > 1000) fehler.preis = 'Preis in Euro, zum Beispiel 1,29.';
  const packung = parseZahl(eingabe.packung);
  if (packung === null || Number.isNaN(packung) || packung <= 0 || packung > 100000) fehler.packung = 'Packungsgröße in Gramm, zum Beispiel 500.';
  if (Object.keys(fehler).length) return { ok: false, fehler, wert: null };
  return { ok: true, fehler, wert: { preis: Math.round(preis * 100) / 100, packungGramm: Math.round(packung * 10) / 10 } };
}

/** Kennung eines gemerkten Preises: einer je Zutat und Markt, ein neuer ersetzt den alten */
export const preisId = (zutatId, marktId) => `${zutatId}|${marktId}`;

/** Ganze Packungen für eine Menge; ein Rest unter 2 % zählt nicht (502 g bei 500-g-Packungen ist eine) */
export const packungenFuer = (gramm, packungGramm) => Math.max(1, Math.ceil(gramm / packungGramm - 0.02));

/**
 * Preis eines Postens der Einkaufsliste in einem Markt.
 * posten: { schluessel (zutatId), gramm }. daten: { angebote, preise, tag }.
 * Liefert { quelle: 'angebot' | 'gemerkt' | 'unbekannt', betrag, packungen, packungGramm, preis, geschaetzt, angebot?, datum? }.
 */
export function preisFuerPosten(posten, markt, { angebote = [], preise = [], tag }) {
  const kandidaten = angebote
    .filter((a) => a.zutatId === posten.schluessel && giltAm(a, tag) && passtZuMarkt(a, markt))
    .map((a) => ({ a, packung: packungAusText(a.menge) }))
    .filter((k) => k.packung)
    .map(({ a, packung }) => {
      const packungen = packungenFuer(posten.gramm, packung.gramm);
      return { quelle: 'angebot', betrag: Math.round(packungen * a.preis * 100) / 100, packungen, packungGramm: packung.gramm, preis: a.preis, geschaetzt: packung.geschaetzt, angebot: a };
    })
    .sort((x, y) => x.betrag - y.betrag);
  if (kandidaten.length) return kandidaten[0];

  const gemerkt = preise.find((p) => p.id === preisId(posten.schluessel, markt.id));
  if (gemerkt && gemerkt.packungGramm > 0 && gemerkt.preis > 0) {
    const packungen = packungenFuer(posten.gramm, gemerkt.packungGramm);
    return { quelle: 'gemerkt', betrag: Math.round(packungen * gemerkt.preis * 100) / 100, packungen, packungGramm: gemerkt.packungGramm, preis: gemerkt.preis, geschaetzt: false, datum: gemerkt.datum };
  }
  return { quelle: 'unbekannt', betrag: null, packungen: null, packungGramm: null, preis: null, geschaetzt: false };
}

/**
 * Grober Preis der ganzen Liste in einem Markt. Unbekannte Posten zählen nicht mit,
 * die Summe sagt deshalb immer dazu, für wie viele Posten sie gilt.
 * Liefert { markt, summe, mitPreis, gesamt, je: Map schluessel → Ergebnis }.
 */
export function listenPreis(liste, markt, daten) {
  const je = new Map(liste.map((p) => [p.schluessel, preisFuerPosten(p, markt, daten)]));
  const bekannt = [...je.values()].filter((e) => e.betrag !== null);
  return { markt, summe: Math.round(bekannt.reduce((s, e) => s + e.betrag, 0) * 100) / 100, mitPreis: bekannt.length, gesamt: liste.length, je };
}

/**
 * Märkte vergleichen. Eine Summe über weniger Posten ist nicht billiger, nur unvollständiger:
 * Deshalb zuerst nach Zahl der Posten mit Preis, erst dann nach Summe.
 */
export function vergleicheMaerkte(liste, maerkte, daten) {
  return maerkte.map((m) => listenPreis(liste, m, daten))
    .sort((a, b) => b.mitPreis - a.mitPreis || a.summe - b.summe || String(a.markt.name).localeCompare(String(b.markt.name), 'de'));
}

/**
 * Text für eine Zeile: "2 × 500 g à 1,29 € = 2,58 €, Angebot" oder "Preis unbekannt".
 * kurz: ohne Summe ("2 × 500 g à 1,29 €, Angebot"), wenn der Betrag ohnehin daneben steht.
 */
export function preisText(e, { kurz = false } = {}) {
  if (e.betrag === null) return 'Preis unbekannt';
  const packung = e.packungGramm >= 1000 ? `${(e.packungGramm / 1000).toLocaleString('de-DE')} ${e.geschaetzt ? 'l' : 'kg'}` : `${e.packungGramm.toLocaleString('de-DE')} ${e.geschaetzt ? 'ml' : 'g'}`;
  // Geschützte Leerzeichen: "2 × 500 g" und "à 1,29 €" sollen nicht mitten in der Angabe umbrechen
  const fest = (text) => text.replace(/ /g, '\u00a0');
  return `${fest(`${e.packungen} × ${packung}`)} ${fest(`à ${euroText(e.preis)}`)}${kurz ? '' : ` = ${fest(euroText(e.betrag))}`}${e.quelle === 'angebot' ? ', Angebot' : ''}`;
}
