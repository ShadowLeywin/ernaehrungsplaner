// Körperansicht: halbtransparente Figur (vorn/hinten, Mann/Frau), Muskeln nach Volumen oder Rang gefärbt.
// Antippen eines Muskels zeigt Name, Funktion, Sätze dieser Woche und passende Übungen mit Beschreibung.
import { el, setze, zahl } from '../ui.js';
import { episch } from '../darstellung.js';
import { UEBUNGEN, MUSKELN } from '../daten/uebungen.js';
import { MUSKEL_INFO, uebungsBeschreibung } from '../daten/beschreibungen.js';
import { ladeSpielstand, verzeichnis } from '../spiel.js';
import { volumenJeMuskel, montagVon, trainierteUebungen } from '../logic/fortschritt.js';
import { GRUPPEN, rangName } from '../logic/raenge.js';
import { erholung, belastungenAus } from '../logic/hantel.js';
import { datumSchluessel } from '../logic/ziele.js';

// Pfade der rechten Körperhälfte (Betrachtersicht, x > 100), Koordinaten als „x,y“; links wird gespiegelt.
const VORN = {
  nacken: ['M108,66 L126,78 L110,80 Z'],
  schultern: ['M127,79 Q149,80 152,102 Q146,112 135,108 Q129,96 127,79 Z'],
  brust: ['M102,86 Q124,80 133,94 Q135,114 119,120 Q104,121 102,112 Z'],
  bizeps: ['M135,110 Q148,112 150,130 Q148,146 141,148 Q133,140 134,121 Z'],
  unterarme: ['M141,151 Q153,153 155,172 Q153,192 147,197 Q139,182 138,162 Z'],
  bauch: ['M101.5,123 L114,123 L114,140 L101.5,140 Z', 'M101.5,143 L114,143 L114,160 L101.5,160 Z', 'M101.5,163 L113,163 L112,186 L101.5,190 Z', 'M117,125 Q130,130 130,150 Q128,176 117,188 Q118,155 117,125 Z'],
  hueftbeuger: ['M106,195 Q121,192 125,203 Q117,213 108,211 Z'],
  quadrizeps: ['M110,214 Q130,205 134,230 Q137,270 127,293 Q114,293 110,270 Q106,240 110,214 Z'],
  adduktoren: ['M102,215 Q109,216 109,240 Q108,262 104,263 Q100,240 102,215 Z'],
  schienbein: ['M114,313 Q122,313 122,340 Q120,370 116,378 Q112,350 114,313 Z'],
  waden: ['M124,311 Q133,317 132,344 Q129,360 125,360 Q124,330 124,311 Z'],
};
const HINTEN = {
  nacken: ['M100,62 L114,71 L130,81 L113,95 L100,118 Z'],
  schultern: ['M128,80 Q149,80 152,102 Q146,112 135,108 Q129,96 128,80 Z'],
  ruecken: ['M102,100 Q115,96 125,100 Q123,124 106,131 Z'],
  lat: ['M119,104 Q137,100 137,121 Q133,151 112,171 Q112,140 119,104 Z'],
  unterer_ruecken: ['M102,148 Q112,150 112,172 Q110,188 102,190 Z'],
  trizeps: ['M135,108 Q149,110 151,128 Q149,146 141,148 Q133,138 135,116 Z'],
  unterarme: ['M141,151 Q153,153 155,172 Q153,192 147,197 Q139,182 138,162 Z'],
  gesaess: ['M102,196 Q128,191 133,214 Q131,236 104,237 Z'],
  beinbizeps: ['M108,241 Q130,237 132,263 Q130,291 120,297 Q110,291 108,263 Z'],
  adduktoren: ['M102,241 Q107,241 107,262 Q104,270 102,263 Z'],
  waden: ['M112,307 Q131,305 133,337 Q129,361 120,363 Q112,350 112,330 Z'],
};
// Umriss als eine geschlossene Linie: rechte Hälfte hinunter, gespiegelt wieder hinauf (keine Naht in der Mitte)
const UMRISS_RECHTS = [[100, 62], [110, 64], [111, 73], [128, 78], [146, 83], [154, 102], [157, 140], [160, 196], [152, 212], [141, 200],
  [137, 150], [133, 122], [131, 150], [128, 190], [134, 212], [137, 262], [131, 300], [130, 330], [127, 382], [131, 402], [110, 406],
  [110, 380], [108, 300], [105, 232], [100, 224]];
const UMRISS = `M${[...UMRISS_RECHTS, ...UMRISS_RECHTS.slice(1, -1).reverse().map(([x, y]) => [200 - x, y])].map(([x, y]) => `${x},${y}`).join(' L')} Z`;

let ansicht = 'vorn';
let geschlecht = null;
let faerbung = 'volumen';
let gewaehlt = null;

export const koerper = {
  titel: 'Körper',
  reiter: 'training',
  render() {
    const wurzel = el('div', {}, el('p', { class: 'leise' }, 'Lade …'));
    ladeSpielstand().then((s) => {
      geschlecht ??= s.geschlecht === 'w' ? 'w' : 'm';
      zeichne(wurzel, s);
    }).catch((f) => setze(wurzel, el('p', { class: 'warnung' }, f.message)));
    return wurzel;
  },
};

/** Koordinaten umformen: Frauen schmalere Schultern, breitere Hüfte; spiegeln für die linke Seite. */
function forme(pfad, spiegeln) {
  return pfad.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, xs, ys) => {
    let x = Number(xs);
    const y = Number(ys);
    if (geschlecht === 'w') {
      const f = y < 130 ? 0.9 : y < 190 ? 0.9 + ((y - 130) / 60) * 0.16 : y < 290 ? 1.06 : 1;
      x = 100 + (x - 100) * f;
    }
    if (spiegeln) x = 200 - x;
    return `${x.toFixed(1)},${y}`;
  });
}

function figur(s, muskelWert) {
  const formen = ansicht === 'vorn' ? VORN : HINTEN;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '30 0 140 420');
  svg.setAttribute('class', 'koerper-figur');
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-label', `Körper ${ansicht === 'vorn' ? 'von vorn' : 'von hinten'}`);
  const kopf = `<ellipse cx="100" cy="36" rx="${geschlecht === 'w' ? 18 : 19}" ry="24" class="k-umriss"/>`;
  const umriss = `<path d="${forme(UMRISS, false)}" class="k-umriss"/>`;
  const muskeln = Object.entries(formen).map(([m, pfade]) => {
    const { fuellung, deckkraft } = muskelWert(m);
    const teile = pfade.flatMap((p) => [forme(p, false), forme(p, true)]).map((d) => `<path d="${d}"/>`).join('');
    return `<g class="k-muskel${gewaehlt === m ? ' gewaehlt' : ''}" data-muskel="${m}" tabindex="0" role="button" aria-label="${MUSKELN[m]}" style="fill:${fuellung};fill-opacity:${deckkraft}">${teile}</g>`;
  }).join('');
  svg.innerHTML = kopf + umriss + muskeln;
  return svg;
}

function zeichne(wurzel, s) {
  const montag = datumSchluessel(montagVon(new Date()));
  const volumen = volumenJeMuskel(s.tage, verzeichnis, montag, datumSchluessel(new Date()));
  const rangVon = (m) => {
    const gruppe = Object.entries(GRUPPEN).find(([, g]) => g.muskeln.includes(m))?.[0];
    return gruppe ? s.raenge.gruppen[gruppe] : null;
  };
  const erh = erholung(belastungenAus(s.tage, verzeichnis));
  s.erholung = erh;
  const muskelWert = (m) => {
    if (faerbung === 'erholung') {
      const e = erh[m];
      if (!e) return { fuellung: '#22c55e', deckkraft: 0.35 };
      return e.bereit ? { fuellung: '#22c55e', deckkraft: 0.75 } : { fuellung: e.anteil < 0.5 ? '#ef4444' : '#f59e0b', deckkraft: 0.85 };
    }
    if (faerbung === 'rang') {
      const r = rangVon(m);
      return r ? { fuellung: r.rang.farbe, deckkraft: 0.85 } : { fuellung: 'var(--text-leise)', deckkraft: 0.15 };
    }
    const saetze = volumen[m] ?? 0;
    return { fuellung: 'var(--akzent)', deckkraft: saetze ? 0.25 + Math.min(1, saetze / 15) * 0.7 : 0.1 };
  };

  const infoBereich = el('div');
  const bild = figur(s, muskelWert);
  const waehle = (m) => {
    gewaehlt = m;
    bild.querySelectorAll('.k-muskel').forEach((g) => g.classList.toggle('gewaehlt', g.dataset.muskel === m));
    setze(infoBereich, muskelInfo(m, volumen[m] ?? 0, rangVon(m), s));
    infoBereich.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  bild.addEventListener('click', (e) => { const g = e.target.closest('.k-muskel'); if (g) waehle(g.dataset.muskel); });
  bild.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { const g = e.target.closest('.k-muskel'); if (g) { e.preventDefault(); waehle(g.dataset.muskel); } } });

  const umschalter = (optionen, wert, setzen) => el('div', { class: 'umschalter', role: 'group' },
    ...optionen.map(([id, text]) => el('button', {
      type: 'button', class: wert === id ? 'aktiv' : '', 'aria-pressed': String(wert === id),
      onclick: () => { setzen(id); zeichne(wurzel, s); },
    }, text)));

  setze(wurzel,
    el('section', { class: 'karte koerper-karte' },
      el('div', { class: 'koerper-schalter' },
        umschalter([['vorn', 'Vorn'], ['hinten', 'Hinten']], ansicht, (v) => { ansicht = v; }),
        umschalter([['m', 'Mann'], ['w', 'Frau']], geschlecht, (v) => { geschlecht = v; })),
      el('div', { class: 'koerper-buehne' }, bild),
      umschalter([['volumen', 'Sätze'], ['erholung', 'Erholung'], ['rang', 'Ränge']], faerbung, (v) => { faerbung = v; }),
      el('p', { class: 'leise klein', style: 'text-align:center' }, {
        volumen: 'Je kräftiger die Farbe, desto mehr Sätze diese Woche (ab 15 Sätzen voll).',
        erholung: 'Grün = erholt · Gelb = fast · Rot = braucht noch Ruhe (24–72 h je nach Satzzahl, grobe Faustregel).',
        rang: 'Farbe = Rang der Muskelgruppe (letzte 12 Wochen). Grau = noch nicht gewertet.',
      }[faerbung]),
      el('p', { class: 'leise klein', style: 'text-align:center' }, 'Tippe auf einen Muskel.')),
    infoBereich);
  if (gewaehlt) setze(infoBereich, muskelInfo(gewaehlt, volumen[gewaehlt] ?? 0, rangVon(gewaehlt), s));
}

function muskelInfo(m, saetze, rang, s) {
  const info = MUSKEL_INFO[m] ?? {};
  const bekannt = new Map(trainierteUebungen(s.tage).map((t) => [t.uebungId, t.anzahl]));
  const uebungen = UEBUNGEN
    .filter((u) => u.muskeln[0] === m && !u.met)
    .sort((a, b) => (bekannt.get(b.id) ?? 0) - (bekannt.get(a.id) ?? 0));
  return el('section', { class: 'karte muskel-info' },
    el('div', { class: 'zeile' }, el('h2', {}, MUSKELN[m]), el('span', { class: 'marke' }, `${zahl(saetze)} Sätze diese Woche`)),
    info.latein ? el('p', { class: 'leise klein' }, info.latein) : null,
    el('p', {}, info.text ?? ''),
    rang ? el('p', { class: 'klein' }, `Rang der Gruppe: `, el('strong', {}, rangName(rang))) : null,
    s.erholung?.[m] ? el('p', { class: 'klein' }, s.erholung[m].bereit ? '✓ Erholt – bereit für Training' : `Noch etwa ${s.erholung[m].rest} h Erholung`) : null,
    el('h3', { class: 'abschnitt' }, episch('Übungen für diesen Muskel', 'Übungen')),
    el('ul', { class: 'liste-einfach uebungs-info' }, ...uebungen.slice(0, 14).map((u) => el('li', {},
      el('details', {},
        el('summary', {}, u.name, bekannt.has(u.id) ? el('span', { class: 'leise klein' }, ` · ${bekannt.get(u.id)}× trainiert`) : null),
        el('p', { class: 'leise klein' }, uebungsBeschreibung(u)),
        bekannt.has(u.id) ? el('a', { class: 'klein', href: `#/fortschritt/${u.id}` }, 'Verlauf ansehen →') : null)))));
}
