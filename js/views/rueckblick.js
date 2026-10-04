// Rückblick: dein Monat oder Jahr in der Schmiede – Zahlen, Highlights, Lieblinge.
import { el, setze, zahl } from '../ui.js';
import { episch } from '../darstellung.js';
import { ladeSpielstand, verzeichnis } from '../spiel.js';
import { holeLebensmittel } from '../lebensmittel.js';
import { rueckblick as berechne } from '../logic/rueckblick.js';
import { bromPortraet } from './brom.js';

const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
let zeitraum = 'monat';
let versatz = 0;

export const rueckblick = {
  get titel() { return episch('Chronik der Taten', 'Rückblick'); },
  reiter: 'mehr',
  render() {
    const wurzel = el('div', {}, el('p', { class: 'leise' }, 'Lade …'));
    lade(wurzel);
    return wurzel;
  },
};

function grenzen() {
  const h = new Date();
  if (zeitraum === 'jahr') {
    const j = h.getFullYear() + versatz;
    return { von: `${j}-01-01`, bis: `${j}-12-31`, name: String(j) };
  }
  const d = new Date(h.getFullYear(), h.getMonth() + versatz, 1);
  const ende = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const s = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  return { von: s(d), bis: s(ende), name: `${MONATE[d.getMonth()]} ${d.getFullYear()}` };
}

async function lade(wurzel) {
  const [s, daten] = await Promise.all([ladeSpielstand(), holeLebensmittel()]);
  const g = grenzen();
  const r = berechne({ tage: s.tage, kennzahlen: s.kennzahlen, von: g.von, bis: g.bis, verzeichnis, lebensmittel: daten.lebensmittel });
  const neu = () => lade(wurzel);
  const kachel = (wert, text) => el('div', { class: 'stat' }, el('strong', {}, wert), el('span', {}, text));
  setze(wurzel,
    el('div', { class: 'umschalter', role: 'group', style: 'margin-bottom:10px' },
      ...[['monat', 'Monat'], ['jahr', 'Jahr']].map(([id, t]) => el('button', {
        type: 'button', class: zeitraum === id ? 'aktiv' : '', onclick: () => { zeitraum = id; versatz = 0; neu(); },
      }, t))),
    el('div', { class: 'datumsleiste' },
      el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Früher', onclick: () => { versatz -= 1; neu(); } }, '‹'),
      el('strong', {}, g.name),
      el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Später', disabled: versatz >= 0, onclick: () => { versatz += 1; neu(); } }, '›')),
    !r ? el('section', { class: 'karte willkommen' }, el('p', { class: 'leise' }, 'In diesem Zeitraum gibt es noch keine Einträge.')) : el('div', {},
      el('section', { class: 'karte hero rueckblick-kopf' }, bromPortraet(64),
        el('p', {}, episch(
          `${g.name}: ${r.aktiveTage} ${r.aktiveTage === 1 ? "Tag" : "Tage"} am Feuer, ${r.workouts} Workout${r.workouts === 1 ? "" : "s"}, ${zahl(r.tonnen)} Tonnen bewegt. ${r.rekorde ? `${r.rekorde} neue Bestmarken. ` : ''}Gute Arbeit, Schmied.`,
          `${g.name}: ${r.aktiveTage} aktive Tage, ${r.workouts} Workouts, ${zahl(r.tonnen)} t Volumen.`))),
      el('section', { class: 'karte' }, el('h2', {}, 'Training'),
        el('div', { class: 'statistik' }, kachel(String(r.workouts), 'Workouts'), kachel(zahl(r.tonnen), 'Tonnen'), kachel(String(r.saetze), 'Sätze')),
        el('div', { class: 'statistik' }, kachel(String(r.rekorde), 'Rekorde'), kachel(zahl(r.trainingsStunden), 'Stunden'), kachel(zahl(r.km), 'km'))),
      el('section', { class: 'karte' }, el('h2', {}, 'Disziplin'),
        el('div', { class: 'statistik' }, kachel(String(r.aktiveTage), 'aktive Tage'), kachel(String(r.laengsteSerie), 'längste Serie'), kachel(String(r.erfassteTage), 'Tage erfasst')),
        el('div', { class: 'statistik' }, kachel(String(r.proteinTage), 'Proteinziel'), kachel(String(r.wasserTage), 'Wasserziel'),
          kachel(r.gewicht ? `${r.gewicht.bis - r.gewicht.von >= 0 ? '+' : ''}${zahl(Math.round((r.gewicht.bis - r.gewicht.von) * 10) / 10)}` : '–', 'kg Gewicht'))),
      r.lieblingsUebungen.length || r.lieblingsEssen.length ? el('section', { class: 'karte' }, el('h2', {}, 'Lieblinge'),
        r.lieblingsUebungen.length ? el('p', { class: 'klein' }, el('strong', {}, 'Übungen: '), r.lieblingsUebungen.map((u) => `${u.name} (${u.anzahl}×)`).join(', ')) : null,
        r.lieblingsEssen.length ? el('p', { class: 'klein' }, el('strong', {}, 'Essen: '), r.lieblingsEssen.map((e) => `${e.name} (${e.anzahl}×)`).join(', ')) : null) : null));
}
