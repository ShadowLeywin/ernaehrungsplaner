// Rezept-Import: aus eingefügtem Text oder aus Schema.org-Daten einer Seite einen Rezept-Entwurf machen.
// Reine Funktionen. Es wird nichts aus dem Netz geholt; verarbeitet wird nur, was der Nutzer einfügt.
// Das Ergebnis ist ein Vorschlag: Unsichere Zeilen sind markiert, der Nutzer prüft im Rezeptformular.

import { normalisiere, sucheZutaten } from './suche.js';

const BRUCH = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };

/** Einheit → Gramm je Einheit. sicher: false heißt Schätzung (Volumen oder Löffel hängen von der Zutat ab). */
const EINHEITEN = [
  { muster: /^(kg|kilo|kilogramm)$/i, gramm: 1000, sicher: true },
  { muster: /^(g|gr|gramm)$/i, gramm: 1, sicher: true },
  { muster: /^(l|liter)$/i, gramm: 1000, sicher: false },
  { muster: /^(ml|milliliter)$/i, gramm: 1, sicher: false },
  { muster: /^(el|essl(ö|oe)ffel)$/i, gramm: 15, sicher: false },
  { muster: /^(tl|teel(ö|oe)ffel)$/i, gramm: 5, sicher: false },
  { muster: /^(prise|prisen|msp|messerspitze)$/i, gramm: 1, sicher: false },
  { muster: /^(st|stk|stück|stueck)$/i, gramm: null, sicher: false },
];

/** "1 1/2", "½", "1,5", "200" → Zahl; null, wenn die Zeile nicht mit einer Menge beginnt */
function leseMenge(text) {
  const m = /^(\d+(?:[.,]\d+)?)?\s*([½¼¾⅓⅔]|\d+\s*\/\s*\d+)?/.exec(text);
  if (!m || (!m[1] && !m[2])) return null;
  let menge = m[1] ? Number(m[1].replace(',', '.')) : 0;
  if (m[2]) {
    if (BRUCH[m[2]] !== undefined) menge += BRUCH[m[2]];
    else { const [z, n] = m[2].split('/').map((x) => Number(x.trim())); if (n) menge += z / n; }
  }
  return { menge, rest: text.slice(m[0].length).trim() };
}

/**
 * Eine Zutatenzeile zerlegen: "200 g Mehl" → { roh, menge: 200, einheit: 'g', name: 'Mehl', gramm: 200, unsicher: false }.
 * Ohne Menge ("Salz und Pfeffer") bleibt gramm null.
 */
export function leseZutatZeile(zeile) {
  const roh = String(zeile).replace(/^[\s\-–•*·]+/, '').trim();
  const gelesen = leseMenge(roh);
  if (!gelesen) return { roh, menge: null, einheit: '', name: roh, gramm: null, unsicher: true };
  // "200g Mehl" und "200 g Mehl" gleich behandeln
  const teile = gelesen.rest.split(/\s+/);
  const einheit = EINHEITEN.find((e) => e.muster.test(teile[0].replace(/\.$/, '')));
  const name = (einheit ? teile.slice(1) : teile).join(' ').replace(/^(von|vom)\s+/i, '').trim();
  if (!name) return { roh, menge: gelesen.menge, einheit: '', name: gelesen.rest, gramm: null, unsicher: true };
  if (!einheit) return { roh, menge: gelesen.menge, einheit: 'Stück', name, gramm: null, unsicher: true };
  const gramm = einheit.gramm === null ? null : Math.round(gelesen.menge * einheit.gramm * 10) / 10;
  return { roh, menge: gelesen.menge, einheit: teile[0].replace(/\.$/, ''), name, gramm, unsicher: !einheit.sicher };
}

const UEBERSCHRIFT_ZUTATEN = /^(zutaten|zutatenliste|das brauchst du|du brauchst)\b.*:?$/i;
const UEBERSCHRIFT_SCHRITTE = /^(zubereitung|anleitung|so geht'?s|so wird'?s gemacht|schritte|arbeitsschritte)\b.*:?$/i;
const PORTIONEN = /(?:für|ergibt|reicht für)?\s*(\d+(?:[.,]\d+)?)\s*(portion|portionen|personen|person|stück|stueck)\b|portionen\s*:?\s*(\d+)/i;

/**
 * Freien Rezepttext in Name, Portionen, Zutatenzeilen und Schritte zerlegen.
 * Mit Überschriften "Zutaten" und "Zubereitung" am zuverlässigsten; ohne sie gilt:
 * Zeilen, die mit einer Menge beginnen, sind Zutaten, der Rest danach sind Schritte.
 */
export function leseRezeptText(text) {
  const zeilen = String(text ?? '').split(/\r?\n/).map((z) => z.trim()).filter(Boolean);
  const rezept = { name: '', portionen: null, zutaten: [], schritte: [] };
  let bereich = 'kopf';
  for (const zeile of zeilen) {
    const portion = PORTIONEN.exec(zeile);
    if (portion && rezept.portionen === null && bereich !== 'schritte' && zeile.length < 60) {
      rezept.portionen = Number((portion[1] ?? portion[3]).replace(',', '.'));
      if (UEBERSCHRIFT_ZUTATEN.test(zeile)) bereich = 'zutaten';
      continue;
    }
    if (UEBERSCHRIFT_ZUTATEN.test(zeile)) { bereich = 'zutaten'; continue; }
    if (UEBERSCHRIFT_SCHRITTE.test(zeile)) { bereich = 'schritte'; continue; }

    const beginntMitMenge = leseMenge(zeile.replace(/^[\s\-–•*·]+/, '')) !== null && !/^\d+[.)]\s/.test(zeile);
    if (bereich === 'kopf') {
      if (beginntMitMenge) { bereich = 'zutaten'; rezept.zutaten.push(leseZutatZeile(zeile)); }
      else if (!rezept.name) rezept.name = zeile.replace(/^#+\s*/, '').slice(0, 80);
      continue;
    }
    if (bereich === 'zutaten') {
      // Ohne Überschrift "Zubereitung": der erste ganze Satz nach den Zutaten beginnt die Schritte
      if (!beginntMitMenge && (/^\d+[.)]\s/.test(zeile) || (zeile.length > 40 && /[.!]$/.test(zeile)))) bereich = 'schritte';
      else { rezept.zutaten.push(leseZutatZeile(zeile)); continue; }
    }
    rezept.schritte.push(zeile.replace(/^(\d+[.)]|schritt\s+\d+:?)\s*/i, '').trim());
  }
  rezept.schritte = rezept.schritte.filter(Boolean);
  return rezept;
}

/* ---------- Schema.org ---------- */

function findeRezept(knoten) {
  if (!knoten || typeof knoten !== 'object') return null;
  if (Array.isArray(knoten)) { for (const k of knoten) { const r = findeRezept(k); if (r) return r; } return null; }
  const typ = [].concat(knoten['@type'] ?? []);
  if (typ.includes('Recipe')) return knoten;
  return findeRezept(knoten['@graph']);
}

function schritteAus(anleitung) {
  if (!anleitung) return [];
  if (typeof anleitung === 'string') return anleitung.split(/\r?\n|(?<=[.!])\s+(?=\d+[.)]\s)/).map((s) => s.trim()).filter(Boolean);
  if (Array.isArray(anleitung)) return anleitung.flatMap(schritteAus);
  if (anleitung.itemListElement) return schritteAus(anleitung.itemListElement); // HowToSection
  return schritteAus(anleitung.text ?? anleitung.name ?? '');
}

const ohneMarkup = (text) => String(text ?? '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Rezept aus dem Quelltext einer Seite lesen (JSON-LD nach schema.org/Recipe).
 * Liefert dieselbe Form wie leseRezeptText oder null, wenn kein Rezept enthalten ist.
 */
export function leseSchemaOrg(html) {
  const bloecke = [...String(html ?? '').matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  // Auch reines JSON-LD ohne <script> annehmen
  if (!bloecke.length && /^\s*[{[]/.test(String(html ?? ''))) bloecke.push(String(html));
  for (const block of bloecke) {
    let daten;
    try { daten = JSON.parse(block); } catch { continue; }
    const r = findeRezept(daten);
    if (!r) continue;
    const ertrag = [].concat(r.recipeYield ?? [])[0];
    const portionen = /\d+(?:[.,]\d+)?/.exec(String(ertrag ?? ''))?.[0];
    return {
      name: ohneMarkup(r.name).slice(0, 80),
      portionen: portionen ? Number(portionen.replace(',', '.')) : null,
      zutaten: [].concat(r.recipeIngredient ?? r.ingredients ?? []).map((z) => leseZutatZeile(ohneMarkup(z))),
      schritte: schritteAus(r.recipeInstructions).map(ohneMarkup).filter(Boolean),
    };
  }
  return null;
}

/** Erst Schema.org versuchen, sonst als freien Text lesen. quelle: 'schema' | 'text' */
export function leseRezept(eingabe) {
  const ausSchema = leseSchemaOrg(eingabe);
  if (ausSchema) return { quelle: 'schema', rezept: ausSchema };
  return { quelle: 'text', rezept: leseRezeptText(eingabe) };
}

/**
 * Passende Zutat suchen: erst der ganze Name, dann das letzte Wort ("rote Linsen" → "Linsen"),
 * dann die Einzahl ("Karotten" → "Karotte", "Zwiebeln" → "Zwiebel", "Eier" → "Ei").
 * Lieber kein Treffer als ein falscher: Was nicht passt, ergänzt der Nutzer im Formular von Hand.
 */
export function findeZutat(suchname, zutaten) {
  const letztes = suchname.split(/\s+/).at(-1) ?? '';
  const versuche = [suchname, letztes];
  for (const endung of ['n', 'en', 'e', 's', 'er']) {
    if (letztes.length > endung.length + 1 && letztes.toLowerCase().endsWith(endung)) versuche.push(letztes.slice(0, -endung.length));
  }
  for (const versuch of versuche) {
    const woerter = normalisiere(versuch).split(' ').filter(Boolean);
    if (!woerter.length) continue;
    // Nur ganze Wörter zählen. Die Suche beim Tippen findet auch Wortanfänge; hier würde das
    // "Wasser" zu "Wassermelone" und "Reis" zu "Reiswaffeln" machen und falsche Nährwerte erzeugen.
    const treffer = sucheZutaten(zutaten, versuch, 30).find((z) => {
      const imNamen = new Set(normalisiere(z.name).split(' '));
      return woerter.every((w) => imNamen.has(w));
    });
    if (treffer) return treffer;
  }
  return null;
}

/**
 * Erkannte Zutatenzeilen den bekannten Zutaten zuordnen.
 * Stückangaben ("2 Eier") werden über die Portion "Stück" der Zutat in Gramm umgerechnet.
 * Liefert je Zeile { ...zeile, treffer: Zutat | null, gramm, unsicher }.
 */
export function ordneZu(zeilen, zutaten) {
  return zeilen.map((zeile) => {
    // Zusätze wie "(gehackt)" oder ", fein gewürfelt" stören die Suche
    const suchname = zeile.name.replace(/\(.*?\)/g, ' ').split(',')[0].trim();
    const treffer = findeZutat(suchname, zutaten);
    let { gramm, unsicher } = zeile;
    if (gramm === null && zeile.menge !== null && treffer) {
      const stueck = treffer.portionen?.find((p) => p.name === 'Stück');
      if (stueck) { gramm = Math.round(zeile.menge * stueck.gramm); unsicher = true; }
    }
    return { ...zeile, treffer, gramm, unsicher: unsicher || !treffer };
  });
}

/** Aus erkanntem Rezept und Zuordnung die Vorlage für das Rezeptformular bauen. */
export function alsVorlage(rezept, zugeordnet) {
  return {
    name: rezept.name,
    portionen: rezept.portionen ?? 4,
    zutaten: zugeordnet.filter((z) => z.treffer).map((z) => ({
      zutatId: z.treffer.id, name: z.treffer.name, marke: z.treffer.marke ?? '', je100: z.treffer.je100, gramm: z.gramm ?? '',
    })),
    schritte: rezept.schritte.map((text) => ({ text })),
  };
}
