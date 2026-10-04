// Trainings-Fortschritt: Wochen, Volumen je Muskel, Rekorde und Verlauf je Übung (#/fortschritt/<uebungId>).
import { el, setze, zahl } from '../ui.js';
import { icon } from '../icons.js';
import { alleEintraege } from '../db.js';
import { holeProfil } from '../state.js';
import { episch } from '../darstellung.js';
import { UEBUNGEN, MUSKELN } from '../daten/uebungen.js';
import { uebungsVerzeichnis, saetzeText } from '../logic/training.js';
import { datumSchluessel } from '../logic/ziele.js';
import {
  uebungsVerlauf, rekorde, volumenJeMuskel, wochenUebersicht, trainierteUebungen, montagVon,
} from '../logic/fortschritt.js';
import { holeGewichtsReihe } from './gewicht.js';
import { uebungsBeschreibung } from '../daten/beschreibungen.js';

const verzeichnis = uebungsVerzeichnis(UEBUNGEN);
const datumKurz = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'numeric' });
const kurz = (datum) => datumKurz.format(new Date(`${datum}T12:00:00`));
const kg = (wert) => `${zahl(Math.round(wert * 10) / 10)} kg`;

export const fortschritt = {
  titel: 'Fortschritt',
  reiter: 'training',
  render() {
    const wurzel = el('div', {}, el('p', { class: 'leise' }, 'Lade …'));
    lade(wurzel);
    return wurzel;
  },
};

async function lade(wurzel) {
  const [eintraege, gewichte, profil] = await Promise.all([alleEintraege('tage'), holeGewichtsReihe(), holeProfil()]);
  const tage = eintraege.map(([, t]) => t);
  const kgKoerper = gewichte.at(-1)?.kg ?? profil.koerper.gewichtKg ?? 75;
  const uebungId = decodeURIComponent(location.hash.split('/')[2] ?? '');
  if (uebungId && verzeichnis.has(uebungId)) setze(wurzel, ...uebungsDetail(uebungId, tage, kgKoerper));
  else setze(wurzel, ...uebersicht(tage, kgKoerper));
}

function uebersicht(tage, kgKoerper) {
  const wochen = wochenUebersicht(tage, verzeichnis, 8, new Date(), kgKoerper);
  const montag = datumSchluessel(montagVon(new Date()));
  const muskeln = volumenJeMuskel(tage, verzeichnis, montag, datumSchluessel(new Date()));
  const r = rekorde(tage, verzeichnis, kgKoerper);
  const uebungen = trainierteUebungen(tage);
  if (!uebungen.length) {
    return [el('section', { class: 'karte willkommen' },
      el('div', { class: 'logo' }, icon('hantel', 34)),
      el('h2', {}, episch('Noch keine Taten verzeichnet', 'Noch keine Daten')),
      el('p', { class: 'leise' }, 'Sobald du Workouts abschließt, siehst du hier Rekorde, Verlauf und Volumen je Muskel.'),
      el('a', { class: 'knopf', href: '#/training' }, 'Zum Training'))];
  }
  return [
    zurueckLink('#/training', 'Training'),
    wochenKarte(wochen),
    muskelKarte(muskeln),
    el('h2', { class: 'abschnitt' }, episch('Ruhmeshalle – deine Rekorde', 'Rekorde')),
    el('section', { class: 'karte' },
      el('ul', { class: 'liste-einfach rekordliste' }, ...uebungen.map(({ uebungId, anzahl }) => {
        const u = verzeichnis.get(uebungId);
        const rek = r.get(uebungId);
        const text = !rek ? `${anzahl}× trainiert`
          : u?.art === 'kraft' ? `max ${kg(rek.kg?.wert ?? 0)} · 1RM ≈ ${kg(rek.e1RM?.wert ?? 0)}`
            : u?.art === 'halten' ? `max ${rek.sek?.wert ?? 0} s`
              : u?.art === 'koerpergewicht' ? `max ${rek.wdh?.wert ?? 0} Wdh${rek.kg?.wert ? ` · +${kg(rek.kg.wert)}` : ''}`
                : `${anzahl}× trainiert`;
        return el('li', {}, el('a', { class: 'eintrag', href: `#/fortschritt/${encodeURIComponent(uebungId)}` },
          el('span', {}, u?.name ?? uebungId),
          el('span', { class: 'leise klein' }, text, ' ›')));
      }))),
  ];
}

function zurueckLink(href, text) {
  return el('a', { class: 'knopf-text zurueck-link', href }, icon('zurueck', 18), text);
}

function wochenKarte(wochen) {
  const max = Math.max(1, ...wochen.map((w) => w.saetze || w.einheiten));
  const diese = wochen.at(-1);
  return el('section', { class: 'karte' },
    el('div', { class: 'zeile' }, el('h2', {}, 'Letzte 8 Wochen'), el('span', { class: 'leise klein' }, 'Sätze je Woche')),
    el('div', { class: 'wochen-balken' }, ...wochen.map((w, i) => el('div', { class: `w-saeule${i === wochen.length - 1 ? ' aktuell' : ''}`, title: `${w.saetze} Sätze, ${w.einheiten} Einheiten` },
      el('span', { class: 'w-wert' }, w.saetze ? String(w.saetze) : ''),
      el('i', { style: `height:${Math.max(3, ((w.saetze || w.einheiten) / max) * 100)}%` }),
      el('span', { class: 'w-name' }, kurz(w.montag))))),
    el('div', { class: 'statistik' },
      stat(String(diese.einheiten), 'Einheiten'),
      stat(String(diese.saetze), 'Sätze'),
      stat(`${zahl(Math.round(diese.volumen / 100) / 10)} t`, 'bewegt')),
    el('p', { class: 'leise klein' }, 'Werte dieser Woche (ab Montag).'));
}

function stat(wert, text) {
  return el('div', { class: 'stat' }, el('strong', {}, wert), el('span', {}, text));
}

/** Sätze je Muskel diese Woche. Orientierung: etwa 10–20 harte Sätze pro Muskel und Woche. */
function muskelKarte(muskeln) {
  const liste = Object.entries(MUSKELN)
    .filter(([m]) => m !== 'ausdauer' && m !== 'ganzkoerper')
    .map(([m, name]) => ({ m, name, saetze: muskeln[m] ?? 0 }))
    .sort((a, b) => b.saetze - a.saetze);
  return el('section', { class: 'karte' },
    el('div', { class: 'zeile' }, el('h2', {}, 'Volumen je Muskel'), el('a', { class: 'klein', href: '#/koerper' }, 'Körper →')),
    el('p', { class: 'leise klein' }, 'Sätze diese Woche (Hilfsmuskeln zählen halb). Orientierung: 10–20 Sätze pro Muskel.'),
    ...liste.filter((x) => x.saetze > 0).map(({ name, saetze }) => el('div', { class: 'zaehler-zeile' },
      el('div', { class: 'zeile' }, el('span', {}, name), el('span', { class: 'leise klein' }, `${zahl(saetze)} Sätze`)),
      el('div', { class: 'balken' }, el('div', {
        style: `width:${Math.min(100, (saetze / 20) * 100)}%;background:${saetze >= 10 ? 'var(--verlauf)' : 'color-mix(in oklab, var(--akzent) 55%, transparent)'}`,
      })))),
    liste.some((x) => x.saetze > 0) ? null : el('p', { class: 'leise' }, 'Diese Woche noch keine Kraftsätze.'),
    el('details', {},
      el('summary', { class: 'klein' }, 'Ohne Training diese Woche'),
      el('p', { class: 'leise klein' }, liste.filter((x) => !x.saetze).map((x) => x.name).join(', ') || '–')));
}

function uebungsDetail(uebungId, tage, kgKoerper) {
  const u = verzeichnis.get(uebungId);
  const verlauf = uebungsVerlauf(uebungId, tage, verzeichnis, kgKoerper);
  const rek = rekorde(tage, verzeichnis, kgKoerper).get(uebungId) ?? {};
  const kennzahl = u.art === 'halten' ? 'sek' : u.art === 'kraft' ? 'e1RM' : 'wdh';
  const einheit = { sek: 's', e1RM: 'kg', wdh: 'Wdh' }[kennzahl];
  const titel = { sek: 'Längstes Halten', e1RM: 'Geschätztes Maximum (1RM)', wdh: 'Meiste Wiederholungen' }[kennzahl];

  return [
    zurueckLink('#/fortschritt', 'Fortschritt'),
    el('section', { class: 'karte hero' },
      el('h2', {}, u.name),
      el('p', { class: 'leise klein' }, u.muskeln.map((m) => MUSKELN[m]).join(', ')),
      el('p', { class: 'klein uebung-beschreibung' }, uebungsBeschreibung(u)),
      el('div', { class: 'statistik' },
        u.art === 'kraft' ? stat(kg(rek.e1RM?.wert ?? 0), '1RM geschätzt') : null,
        u.art === 'kraft' ? stat(kg(rek.kg?.wert ?? 0), 'Max. Gewicht') : null,
        u.art === 'koerpergewicht' ? stat(String(rek.wdh?.wert ?? 0), 'Max. Wdh') : null,
        u.art === 'halten' ? stat(`${rek.sek?.wert ?? 0} s`, 'Max. Halten') : null,
        stat(String(verlauf.length), 'Einheiten'))),
    verlauf.length >= 2
      ? el('section', { class: 'karte' }, el('h2', {}, titel), linienDiagramm(verlauf.map((p) => ({ x: p.datum, y: p[kennzahl] })), einheit))
      : el('p', { class: 'leise klein' }, 'Ab zwei Einheiten erscheint hier eine Verlaufskurve.'),
    el('h2', { class: 'abschnitt' }, 'Verlauf'),
    el('section', { class: 'karte' },
      el('ul', { class: 'liste-einfach' }, ...[...verlauf].reverse().map((p) => {
        const t = tage.find((tag) => tag.datum === p.datum)?.trainings?.find((x) => x.id === p.trainingId);
        const e = t?.uebungen.find((x) => x.uebungId === uebungId);
        return el('li', { class: 'zeile' },
          el('span', {}, kurz(p.datum)),
          el('span', { class: 'leise klein' }, saetzeText((e?.saetze ?? []).filter((s) => s.erledigt), u.art),
            u.art === 'kraft' ? ` · 1RM ≈ ${kg(p.e1RM)}` : ''));
      }))),
  ];
}

/** Einfache Verlaufslinie als SVG. punkte: [{ x: Datumsschlüssel, y }] */
export function linienDiagramm(punkte, einheit) {
  const B = 320;
  const H = 150;
  const rand = { l: 34, r: 10, o: 12, u: 22 };
  const ys = punkte.map((p) => p.y);
  let min = Math.min(...ys);
  let max = Math.max(...ys);
  if (max - min < 1) { max += 1; min -= 1; }
  const px = (i) => rand.l + (i / Math.max(1, punkte.length - 1)) * (B - rand.l - rand.r);
  const py = (y) => rand.o + (1 - (y - min) / (max - min)) * (H - rand.o - rand.u);
  const linie = punkte.map((p, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)} ${py(p.y).toFixed(1)}`).join(' ');
  const flaeche = `${linie} L${px(punkte.length - 1).toFixed(1)} ${H - rand.u} L${px(0).toFixed(1)} ${H - rand.u} Z`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${B} ${H}`);
  svg.setAttribute('class', 'linien-diagramm');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Verlauf von ${zahl(ys[0])} auf ${zahl(ys.at(-1))} ${einheit}`);
  svg.innerHTML = `
    <defs><linearGradient id="ld-flaeche" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" style="stop-color:var(--akzent);stop-opacity:.35"/><stop offset="1" style="stop-color:var(--akzent);stop-opacity:0"/>
    </linearGradient></defs>
    <text x="2" y="${py(max) + 4}" class="d-achse">${zahl(Math.round(max))}</text>
    <text x="2" y="${py(min) + 4}" class="d-achse">${zahl(Math.round(min))}</text>
    <line x1="${rand.l}" x2="${B - rand.r}" y1="${py(max)}" y2="${py(max)}" class="d-raster"/>
    <line x1="${rand.l}" x2="${B - rand.r}" y1="${py(min)}" y2="${py(min)}" class="d-raster"/>
    <path d="${flaeche}" fill="url(#ld-flaeche)"/>
    <path d="${linie}" fill="none" style="stroke:var(--akzent);stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round"/>
    ${punkte.map((p, i) => `<circle cx="${px(i)}" cy="${py(p.y)}" r="3.2" style="fill:var(--akzent)"/>`).join('')}
    <text x="${rand.l}" y="${H - 6}" class="d-achse">${kurz(punkte[0].x)}</text>
    <text x="${B - rand.r}" y="${H - 6}" class="d-achse" text-anchor="end">${kurz(punkte.at(-1).x)}</text>`;
  return svg;
}
