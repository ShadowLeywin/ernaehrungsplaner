// Erfolge: Übersicht nach Bereichen mit Stufen-Medaillen, Fortschritt zur nächsten Stufe und geheimen Erfolgen.
import { el, setze } from '../ui.js';
import { kopfBild } from '../bilder.js';
import { episch } from '../darstellung.js';
import { ladeSpielstand } from '../spiel.js';
import { STUFEN, BEREICHE, erfolgsText } from '../logic/erfolge.js';
import { medaille } from './emblem.js';
import { bromPortraet, bromAn } from './brom.js';

let bereichFilter = null;

export const erfolge = {
  get titel() { return episch('Halle der Taten', 'Erfolge'); },
  reiter: 'lager',
  render() {
    const wurzel = el('div', {}, el('p', { class: 'leise' }, 'Lade …'));
    ladeSpielstand().then((s) => zeichne(wurzel, s)).catch((f) => setze(wurzel, el('p', { class: 'warnung' }, f.message)));
    return wurzel;
  },
};

function zeichne(wurzel, s) {
  const alle = s.bewertungen;
  const zaehlung = STUFEN.map((st, i) => ({ st, n: alle.filter((b) => !b.erfolg.geheim && b.stufe >= i).length }));
  const geheimOffen = alle.filter((b) => b.erfolg.geheim && b.stufe >= 0).length;
  const geheimGesamt = alle.filter((b) => b.erfolg.geheim).length;
  const sichtbar = alle.filter((b) => !bereichFilter || b.erfolg.bereich === bereichFilter);

  setze(wurzel,
    kopfBild('halle', 'Halle der Taten'),
    el('section', { class: 'karte hero erfolge-kopf' },
      bromAn() && document.documentElement.dataset.stil !== 'schlicht' ? el('div', { class: 'erfolge-brom' }, bromPortraet(84)) : null,
      el('div', {},
        el('h2', {}, episch('Was du geschmiedet hast', 'Deine Erfolge')),
        el('div', { class: 'stufen-zaehler' }, ...zaehlung.map(({ st, n }) => el('span', { class: 'stufen-chip', title: st.name },
          el('i', { style: `background:${st.farbe}` }), String(n)))),
        el('p', { class: 'leise klein' }, `Geheime Erfolge: ${geheimOffen} von ${geheimGesamt}`))),
    el('div', { class: 'chips scroll', style: 'margin-bottom:12px' },
      chip('Alle', !bereichFilter, () => { bereichFilter = null; zeichne(wurzel, s); }),
      ...Object.entries(BEREICHE).map(([id, b]) => chip(episch(b.episch, b.name), bereichFilter === id, () => { bereichFilter = id; zeichne(wurzel, s); }))),
    ...Object.entries(BEREICHE)
      .filter(([id]) => !bereichFilter || bereichFilter === id)
      .map(([id, b]) => {
        const liste = sichtbar.filter((x) => x.erfolg.bereich === id);
        return el('section', { class: 'karte' },
          el('h2', {}, episch(b.episch, b.name)),
          ...liste.map(erfolgsZeile));
      }));
}

function chip(text, an, beiKlick) {
  return el('button', { class: `chip${an ? ' an' : ''}`, type: 'button', 'aria-pressed': String(an), onclick: beiKlick }, text);
}

function erfolgsZeile(b) {
  const { erfolg, stufe, stufenInfo, naechste, fortschritt } = b;
  const verborgen = erfolg.geheim && stufe < 0;
  const name = verborgen ? '???' : episch(erfolg.name, erfolg.schlicht);
  const beschreibung = verborgen
    ? 'Geheimer Erfolg – finde heraus, wie er sich freischaltet.'
    : erfolg.geheim ? erfolg.text
      : naechste != null ? `Nächste Stufe (${STUFEN[stufe + 1].name}): ${erfolgsText(erfolg, naechste)}` : `Höchste Stufe erreicht: ${erfolgsText(erfolg, erfolg.schwellen.at(-1))}`;
  return el('div', { class: `erfolg${stufe >= 0 ? ' erreicht' : ''}` },
    medaille(stufenInfo, 44, erfolg.geheim, verborgen),
    el('div', {},
      el('div', { class: 'zeile' },
        el('strong', {}, name),
        stufenInfo && !erfolg.geheim ? el('span', { class: 'marke', style: `background:color-mix(in oklab, ${stufenInfo.farbe} 28%, transparent);color:inherit` }, stufenInfo.name) : null),
      el('p', { class: 'leise klein' }, beschreibung),
      !erfolg.geheim && naechste != null
        ? el('div', { class: 'balken mini' }, el('div', { style: `width:${Math.round(fortschritt * 100)}%;background:${STUFEN[stufe + 1].farbe}` }))
        : null));
}
