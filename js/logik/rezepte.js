// Rezepte: Nährwerte aus den Zutaten berechnen und Eingaben prüfen. Reine Funktionen.

import { fuerMenge, runde, summe } from './naehrwerte.js';
import { tageZwischen } from './datum.js';
import { parseZahl } from './zutat.js';

const teile = (werte, faktor, stellen) => Object.fromEntries(
  Object.entries(werte).map(([id, wert]) => [id, stellen === undefined ? wert * faktor : runde(wert * faktor, stellen)]),
);

/**
 * Alles, was sich aus einem Rezept ausrechnen lässt.
 * Ist das Gewicht nach dem Kochen bekannt (Meal-Prep), gilt es als Grundlage für Portion und Werte je 100 g:
 * Beim Kochen verdampft oder bindet sich Wasser, die Nährwerte bleiben, also ändert sich nur die Dichte.
 */
export function rezeptWerte(rezept) {
  const zutaten = (rezept.zutaten ?? []).filter((z) => z.gramm > 0);
  const gesamt = summe(zutaten.map((z) => fuerMenge(z.je100, z.gramm)));
  const gesamtGramm = zutaten.reduce((s, z) => s + z.gramm, 0);
  const portionen = rezept.portionen > 0 ? rezept.portionen : 1;
  const gekocht = rezept.gewichtGekocht > 0;
  const fertigGramm = gekocht ? rezept.gewichtGekocht : gesamtGramm;
  return {
    gesamt,
    gesamtGramm, // Rohgewicht: maßgeblich für die Einkaufsliste
    fertigGramm, // Gewicht dessen, was auf dem Teller landet
    gekocht,
    portionen,
    portionGramm: fertigGramm / portionen,
    jePortion: teile(gesamt, 1 / portionen),
    je100: fertigGramm > 0 ? teile(gesamt, 100 / fertigGramm, 2) : {},
    // Fehlt bei einer Zutat ein Makro, ist die Summe nur eine Untergrenze
    unvollstaendig: zutaten.some((z) => ['protein', 'kh', 'fett'].some((id) => typeof z.je100?.[id] !== 'number')),
  };
}

/** Ein Rezept so verpacken, dass das Tagebuch es wie eine Zutat behandeln kann. */
export function rezeptAlsZutat(rezept) {
  const w = rezeptWerte(rezept);
  return {
    id: `rezept:${rezept.id}`,
    name: rezept.name,
    marke: '',
    kategorie: 'rezept',
    quelle: 'rezept',
    istRezept: true,
    je100: w.je100,
    portionen: w.portionGramm > 0 ? [{ name: 'Portion', gramm: runde(w.portionGramm, 0) }] : [],
    unvollstaendig: w.unvollstaendig,
  };
}

/**
 * Eingabe aus dem Formular prüfen.
 * eingabe: { name, portionen: '4', zutaten: [{ zutatId, name, je100, gramm: '200' }], schritte: [{ text, prinzip }] }
 * Liefert { ok, fehler, rezept }. fehler.gramm und fehler.schritt sind nach Position sortierte Objekte.
 */
export function pruefeRezept(eingabe) {
  const fehler = {};
  const name = String(eingabe.name ?? '').trim();
  if (!name) fehler.name = 'Gib dem Rezept einen Namen.';
  else if (name.length > 80) fehler.name = 'Höchstens 80 Zeichen.';

  const portionen = parseZahl(eingabe.portionen);
  if (portionen === null || Number.isNaN(portionen) || portionen <= 0 || portionen > 100) fehler.portionen = 'Eine Zahl von 1 bis 100.';

  const zutaten = [];
  const grammFehler = {};
  (eingabe.zutaten ?? []).forEach((z, i) => {
    const gramm = parseZahl(z.gramm);
    if (gramm === null) grammFehler[i] = 'Wie viel Gramm?';
    else if (Number.isNaN(gramm) || gramm <= 0 || gramm > 20000) grammFehler[i] = 'Gramm von 1 bis 20.000.';
    else zutaten.push({ zutatId: z.zutatId, name: z.name, marke: z.marke ?? '', gramm, je100: z.je100 });
  });
  if (Object.keys(grammFehler).length) fehler.gramm = grammFehler;
  if (!(eingabe.zutaten ?? []).length) fehler.zutaten = 'Ein Rezept braucht mindestens eine Zutat.';

  const schritte = [];
  const schrittFehler = {};
  (eingabe.schritte ?? []).forEach((s, i) => {
    const text = String(s.text ?? '').trim();
    const prinzip = String(s.prinzip ?? '').trim();
    if (!text && !prinzip) return; // leere Zeile im Formular
    if (!text) schrittFehler[i] = 'Beschreibe den Schritt, zu dem dieses Prinzip gehört.';
    else if (text.length > 1000 || prinzip.length > 600) schrittFehler[i] = 'Zu lang: Schritt höchstens 1.000, Prinzip höchstens 600 Zeichen.';
    else schritte.push(prinzip ? { text, prinzip } : { text });
  });
  if (Object.keys(schrittFehler).length) fehler.schritt = schrittFehler;

  // Meal-Prep, alles freiwillig
  const vorkochen = {};
  const gewicht = parseZahl(eingabe.gewichtGekocht);
  if (gewicht !== null) {
    if (Number.isNaN(gewicht) || gewicht <= 0 || gewicht > 50000) fehler.gewichtGekocht = 'Gramm von 1 bis 50.000.';
    else vorkochen.gewichtGekocht = gewicht;
  }
  const haltbar = parseZahl(eingabe.haltbarTage);
  if (haltbar !== null) {
    if (!Number.isInteger(haltbar) || haltbar < 1 || haltbar > 30) fehler.haltbarTage = 'Ganze Tage von 1 bis 30.';
    else vorkochen.haltbarTage = haltbar;
  }
  if (eingabe.einfrierbar) vorkochen.einfrierbar = true;

  const ok = Object.keys(fehler).length === 0;
  return { ok, fehler, rezept: ok ? { name, portionen, zutaten, schritte, ...vorkochen } : null };
}

/**
 * Wird im Wochenplan eine vorgekochte Portion zu spät gegessen?
 * Annahme: Gekocht wird am ersten Tag, an dem das Rezept im Plan steht. Liegt ein späterer Tag
 * außerhalb der Haltbarkeit, gibt es eine Warnung; ab da zählt dieser Tag als neuer Kochtag
 * (neu gekocht oder aus dem Gefrierfach).
 * posten: Plan-Posten mehrerer Tage, rezepte: Map nach id. Liefert Map postenId → { tage, haltbar, einfrierbar }.
 */
export function haltbarkeitsWarnungen(posten, rezepte) {
  const warnungen = new Map();
  const jeRezept = new Map();
  for (const p of posten) {
    const rezept = p.rezeptId ? rezepte.get(p.rezeptId) : null;
    if (!rezept?.haltbarTage) continue;
    if (!jeRezept.has(rezept.id)) jeRezept.set(rezept.id, []);
    jeRezept.get(rezept.id).push(p);
  }
  for (const [id, liste] of jeRezept) {
    const rezept = rezepte.get(id);
    liste.sort((a, b) => a.datum.localeCompare(b.datum));
    let kochtag = liste[0].datum;
    for (const p of liste) {
      const tage = tageZwischen(kochtag, p.datum);
      if (tage > rezept.haltbarTage) {
        warnungen.set(p.id, { tage, haltbar: rezept.haltbarTage, einfrierbar: Boolean(rezept.einfrierbar) });
        kochtag = p.datum;
      }
    }
  }
  return warnungen;
}
