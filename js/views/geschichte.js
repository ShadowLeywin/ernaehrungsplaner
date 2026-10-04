// Brom's Geschichte: Kapitel, die mit dem Level freigeschaltet werden.
import { el, setze } from '../ui.js';
import { episch } from '../darstellung.js';
import { ladeSpielstand } from '../spiel.js';
import { KAPITEL } from '../logic/geschichte.js';
import { bromPortraet } from './brom.js';

export const geschichte = {
  get titel() { return episch('Brom erzählt', 'Geschichte'); },
  reiter: 'mehr',
  render() {
    const wurzel = el('div', {}, el('p', { class: 'leise' }, 'Lade …'));
    ladeSpielstand().then((s) => setze(wurzel,
      el('section', { class: 'karte hero geschichte-kopf' }, bromPortraet(72),
        el('div', {}, el('h2', {}, 'Geschichten am Feuer'),
          el('p', { class: 'leise klein' }, `Mit jedem Level erzählt Brom mehr. Du bist Level ${s.level.level}.`))),
      ...KAPITEL.map((k, i) => (s.level.level >= k.level
        ? el('details', { class: 'karte kapitel', open: i === KAPITEL.filter((x) => s.level.level >= x.level).length - 1 },
          el('summary', {}, el('span', { class: 'leise klein' }, `Kapitel ${i + 1} · ab Level ${k.level}`), el('br'), el('strong', {}, k.titel)),
          el('p', { class: 'kapitel-text' }, k.text))
        : el('div', { class: 'karte kapitel gesperrt' },
          el('span', { class: 'leise klein' }, `Kapitel ${i + 1} · ab Level ${k.level}`), el('br'), el('strong', {}, '???')))))).catch((f) => setze(wurzel, el('p', { class: 'warnung' }, f.message)));
    return wurzel;
  },
};
