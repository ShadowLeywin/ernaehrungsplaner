// Gewichtsverlauf als SVG: Tageswerte (Punkte), 7-Tage-Durchschnitt (Linie), Plan (gestrichelt).
// Eine y-Achse, Tooltip beim Tippen/Überfahren, Farben über CSS-Klassen (hell/dunkel).
import { el, zahl } from '../ui.js';

const SVG = 'http://www.w3.org/2000/svg';
const B = 360;
const H = 200;
const RAND = { links: 36, rechts: 8, oben: 10, unten: 22 };
const datumKurz = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'numeric' });
const alsDatum = (s) => new Date(`${s}T12:00:00`);

function svg(tag, attribute = {}, ...kinder) {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attribute)) e.setAttribute(k, v);
  e.append(...kinder);
  return e;
}

/** Runde Achsenwerte (0,5er- oder 1er-Schritte) für den Bereich. */
function achsenwerte(min, max) {
  const schritt = max - min > 3 ? 1 : 0.5;
  const werte = [];
  for (let w = Math.floor(min / schritt) * schritt; w <= max + 1e-9; w += schritt) werte.push(Math.round(w * 10) / 10);
  return werte;
}

const monatKurz = new Intl.DateTimeFormat('de-DE', { month: 'short' });

/**
 * Monatsdurchschnitte als Säulen: Höhe = Ø-Gewicht (Achse startet nicht bei 0, damit Änderungen sichtbar sind –
 * deshalb steht der Wert an jeder Säule). Der gewählte Monat ist hervorgehoben; Tippen wählt einen Monat.
 */
export function monatsDiagramm(monate, gewaehlt, beiAuswahl) {
  if (!monate.length) return el('p', { class: 'leise klein' }, 'Noch keine Messungen.');
  const letzte = monate.slice(-12);
  const minKg = Math.min(...letzte.map((m) => m.kg));
  const maxKg = Math.max(...letzte.map((m) => m.kg));
  const unten = Math.floor((minKg - 0.5) * 2) / 2;
  const oben = Math.ceil((maxKg + 0.3) * 2) / 2;
  const breite = (B - RAND.links - RAND.rechts) / letzte.length;
  const y = (kg) => RAND.oben + 12 + (1 - (kg - unten) / (oben - unten)) * (H - RAND.oben - RAND.unten - 12);

  const saeulen = letzte.map((m, i) => {
    const x = RAND.links + i * breite + breite * 0.18;
    const w = breite * 0.64;
    const yOben = y(m.kg);
    const aktiv = m.monat === gewaehlt;
    const gruppe = svg('g', { class: `m-saeule${aktiv ? ' aktiv' : ''}`, role: 'button', tabindex: 0, 'aria-label': `${m.monat}: ${zahl(Math.round(m.kg * 10) / 10)} kg` },
      svg('rect', { x, y: yOben, width: w, height: Math.max(2, H - RAND.unten - yOben), rx: 4 }),
      svg('text', { class: 'd-wert', x: x + w / 2, y: yOben - 4, 'text-anchor': 'middle' }, zahl(Math.round(m.kg * 10) / 10)),
      svg('text', { class: 'd-achse', x: x + w / 2, y: H - 6, 'text-anchor': 'middle' }, monatKurz.format(new Date(`${m.monat}-15T12:00:00`))));
    gruppe.addEventListener('click', () => beiAuswahl(m.monat));
    return gruppe;
  });

  return el('div', { class: 'diagramm-rahmen' },
    svg('svg', { viewBox: `0 0 ${B} ${H}`, class: 'diagramm', role: 'img', 'aria-label': 'Durchschnittsgewicht je Monat' },
      svg('line', { class: 'd-raster', x1: RAND.links, x2: B - RAND.rechts, y1: H - RAND.unten, y2: H - RAND.unten }),
      ...saeulen));
}

/**
 * reihe: [{ datum, kg }] Tageswerte · glatt: [{ datum, kg }] 7-Tage-Ø · plan: [{ datum, kg }, { datum, kg }] oder null
 */
export function gewichtsDiagramm(reihe, glatt, plan) {
  if (reihe.length < 2) {
    return el('p', { class: 'leise klein' }, 'Das Diagramm erscheint ab zwei Messungen.');
  }

  const alleDaten = [...reihe, ...(plan ?? [])];
  const t0 = Math.min(...alleDaten.map((m) => alsDatum(m.datum)));
  const t1 = Math.max(...alleDaten.map((m) => alsDatum(m.datum)));
  const kgWerte = alleDaten.map((m) => m.kg);
  const yMin = Math.min(...kgWerte) - 0.3;
  const yMax = Math.max(...kgWerte) + 0.3;
  const ticks = achsenwerte(yMin, yMax);
  const unten = Math.min(yMin, ticks[0]);
  const oben = Math.max(yMax, ticks.at(-1));

  const x = (datum) => RAND.links + ((alsDatum(datum) - t0) / Math.max(1, t1 - t0)) * (B - RAND.links - RAND.rechts);
  const y = (kg) => RAND.oben + (1 - (kg - unten) / (oben - unten)) * (H - RAND.oben - RAND.unten);
  const pfad = (punkte) => punkte.map((m, i) => `${i ? 'L' : 'M'}${x(m.datum).toFixed(1)},${y(m.kg).toFixed(1)}`).join(' ');

  const raster = ticks.map((w) => svg('g', {},
    svg('line', { class: 'd-raster', x1: RAND.links, x2: B - RAND.rechts, y1: y(w), y2: y(w) }),
    svg('text', { class: 'd-achse', x: RAND.links - 4, y: y(w) + 3, 'text-anchor': 'end' }, zahl(w))));
  const xBeschriftung = [alleDaten.reduce((a, b) => (a.datum < b.datum ? a : b)), alleDaten.reduce((a, b) => (a.datum > b.datum ? a : b))]
    .map((m, i) => svg('text', { class: 'd-achse', x: x(m.datum), y: H - 6, 'text-anchor': i ? 'end' : 'start' }, datumKurz.format(alsDatum(m.datum))));

  const glattePunkte = glatt.filter((m) => m.kg != null);
  const fokusLinie = svg('line', { class: 'd-fokus', y1: RAND.oben, y2: H - RAND.unten, visibility: 'hidden' });
  const fokusPunkt = svg('circle', { class: 'd-fokuspunkt', r: 5, visibility: 'hidden' });

  const zeichnung = svg('svg', { viewBox: `0 0 ${B} ${H}`, class: 'diagramm', role: 'img', 'aria-label': 'Gewichtsverlauf' },
    ...raster,
    ...xBeschriftung,
    plan ? svg('path', { class: 'd-plan', d: pfad(plan) }) : '',
    svg('path', { class: 'd-schnitt', d: pfad(glattePunkte) }),
    ...reihe.map((m) => svg('circle', { class: 'd-punkt', cx: x(m.datum), cy: y(m.kg), r: 4 })),
    fokusLinie,
    fokusPunkt);

  const tooltip = el('div', { class: 'd-tooltip', hidden: true });
  const zeigeNaechsten = (ereignis) => {
    const rahmen = zeichnung.getBoundingClientRect();
    const px = ((ereignis.clientX - rahmen.left) / rahmen.width) * B;
    const naechster = reihe.reduce((a, b) => (Math.abs(x(b.datum) - px) < Math.abs(x(a.datum) - px) ? b : a));
    const schnitt = glatt.find((m) => m.datum === naechster.datum)?.kg;
    for (const [k, v] of Object.entries({ x1: x(naechster.datum), x2: x(naechster.datum) })) fokusLinie.setAttribute(k, v);
    fokusPunkt.setAttribute('cx', x(naechster.datum));
    fokusPunkt.setAttribute('cy', y(naechster.kg));
    fokusLinie.setAttribute('visibility', 'visible');
    fokusPunkt.setAttribute('visibility', 'visible');
    tooltip.hidden = false;
    tooltip.textContent = `${datumKurz.format(alsDatum(naechster.datum))}: ${zahl(naechster.kg)} kg`
      + (schnitt != null ? ` · Ø 7 Tage ${zahl(Math.round(schnitt * 10) / 10)} kg` : '');
  };
  const verstecke = () => {
    fokusLinie.setAttribute('visibility', 'hidden');
    fokusPunkt.setAttribute('visibility', 'hidden');
    tooltip.hidden = true;
  };
  zeichnung.addEventListener('pointermove', zeigeNaechsten);
  zeichnung.addEventListener('pointerdown', zeigeNaechsten);
  zeichnung.addEventListener('pointerleave', verstecke);

  const legende = el('div', { class: 'legende klein' },
    el('span', {}, el('i', { class: 'l-punkt' }), 'Tageswert'),
    el('span', {}, el('i', { class: 'l-schnitt' }), 'Ø 7 Tage'),
    plan ? el('span', {}, el('i', { class: 'l-plan' }), 'Plan') : null);

  return el('div', { class: 'diagramm-rahmen' }, legende, zeichnung, tooltip);
}
