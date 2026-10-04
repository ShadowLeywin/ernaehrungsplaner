// Heldenbogen (Charakter): Level, Klasse, sechs Werte, Ränge je Muskelgruppe und gesamt.
import { el, setze, zahl } from '../ui.js';
import { icon } from '../icons.js';
import { episch } from '../darstellung.js';
import { ladeSpielstand, verzeichnis } from '../spiel.js';
import { WERTE } from '../logic/charakter.js';
import { GRUPPEN, RAENGE, rangName } from '../logic/raenge.js';
import { rangEmblem, werteNetz } from './emblem.js';

export const held = {
  get titel() { return episch('Heldenbogen', 'Charakter'); },
  reiter: 'lager',
  render() {
    const wurzel = el('div', {}, el('p', { class: 'leise' }, 'Lade …'));
    ladeSpielstand().then((s) => setze(wurzel, ...inhalt(s)))
      .catch((f) => setze(wurzel, el('p', { class: 'warnung' }, f.message)));
    return wurzel;
  },
};

function inhalt(s) {
  const { level, klasse, werte, raenge, xp, profil } = s;
  return [
    el('section', { class: 'karte hero held-kopf' },
      el('div', { class: 'held-zeile' },
        el('div', { class: 'level-kreis' }, el('span', {}, 'Lvl'), el('strong', {}, String(level.level))),
        el('div', {},
          el('h2', {}, profil.name || episch('Namenloser Held', 'Du')),
          el('p', { class: 'held-klasse' }, episch(klasse.episch, klasse.schlicht)),
          el('p', { class: 'leise klein' }, `Stärken: ${WERTE[klasse.haupt].name} · ${WERTE[klasse.neben].name}`))),
      el('div', { class: 'balken xp-balken' }, el('div', { style: `width:${Math.round(level.anteil * 100)}%;background:var(--verlauf)` })),
      el('p', { class: 'leise klein zeile' },
        el('span', {}, `${zahl(level.xpInStufe)} / ${zahl(level.xpBisNaechste)} XP`),
        el('span', {}, `gesamt ${zahl(xp)} XP`))),

    el('section', { class: 'karte' },
      el('h2', {}, episch('Eigenschaften', 'Werte')),
      el('div', { class: 'netz-rahmen' }, werteNetz(werte, WERTE)),
      el('ul', { class: 'liste-einfach werte-liste' }, ...Object.entries(WERTE).map(([id, w]) => el('li', {},
        el('div', { class: 'zeile' }, el('strong', {}, w.name), el('span', { class: 'hub-zahl klein' }, String(werte[id]))),
        el('div', { class: 'balken mini' }, el('div', { style: `width:${werte[id]}%;background:var(--verlauf)` })),
        el('p', { class: 'leise klein' }, w.text))))),

    el('section', { class: 'karte' },
      el('div', { class: 'zeile' }, el('h2', {}, 'Ränge'), el('span', { class: 'leise klein' }, 'Bestleistung der letzten 12 Wochen')),
      el('div', { class: 'rang-gesamt' },
        rangEmblem(raenge.gesamt, 84),
        el('div', {},
          el('p', { class: 'leise klein' }, 'Gesamtrang'),
          el('strong', { class: 'rang-name' }, raenge.gesamt ? rangName(raenge.gesamt) : 'Unplatziert'),
          el('p', { class: 'leise klein' }, raenge.gesamt
            ? 'Schnitt deiner gewerteten Muskelgruppen, bezogen aufs Körpergewicht.'
            : 'Trainiere mindestens drei Muskelgruppen mit Gewicht oder Körpergewicht, um platziert zu werden.'))),
      el('ul', { class: 'liste-einfach rang-liste' }, ...Object.entries(GRUPPEN).map(([id, g]) => {
        const r = raenge.gruppen[id];
        return el('li', {},
          rangEmblem(r, 40),
          el('div', {},
            el('strong', {}, g.name),
            el('p', { class: 'leise klein' }, r ? `${rangName(r)} · ${verzeichnis.get(r.uebungId)?.name ?? ''}` : 'Noch nicht gewertet')),
          r && r.rang.id !== 'legende' ? el('div', { class: 'balken mini rang-fortschritt' }, el('div', { style: `width:${Math.round(r.fortschritt * 100)}%;background:${r.rang.farbe}` })) : null);
      })),
      el('details', {},
        el('summary', { class: 'klein' }, 'Wie funktionieren die Ränge?'),
        el('p', { class: 'leise klein' }, 'Jede Übung wird mit einer Spitzenleistung verglichen (z. B. Bankdrücken 2 × Körpergewicht als 1RM, 25 Klimmzüge, 2 Minuten Handstand). Bei Frauen gelten angepasste Werte. Pro Muskelgruppe zählt die beste Leistung der letzten 12 Wochen.'),
        el('div', { class: 'chips' }, ...RAENGE.map((r) => el('span', { class: 'marke', style: `background:color-mix(in oklab, ${r.farbe} 25%, transparent);color:inherit` }, r.name))))),

    el('div', { class: 'kacheln' },
      kachel('#/erfolge', 'pokal', episch('Halle der Taten', 'Erfolge'), `${s.bewertungen.filter((b) => b.stufe >= 0).length} freigeschaltet`),
      kachel('#/koerper', 'koerper', 'Körper', 'Muskeln & Übungen'),
      kachel('#/freunde', 'freunde', episch('Gefährten', 'Freunde'), 'Rangkarte teilen'),
      kachel('#/fortschritt', 'hoch', 'Fortschritt', 'Rekorde & Verlauf')),
  ];
}

function kachel(href, iconName, titel, text) {
  return el('a', { class: 'kachel', href },
    el('span', { class: 'kachel-icon' }, icon(iconName)),
    el('div', {}, el('strong', {}, titel), el('br'), el('span', {}, text)));
}
