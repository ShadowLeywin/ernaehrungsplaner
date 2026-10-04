// Brom: Maskottchen – halb Schmied, halb Zwerg, gedrungen und sehr muskulös, Vollbart, ganz normale
// Alltagskleidung (T-Shirt, Jeans). Verkündet Erfolge wie ein Herold, knapp und respektvoll.
// Nie Push-Nachrichten; erscheint nur in der App und lässt sich abschalten.
import { el, setze } from '../ui.js';
import { icon } from '../icons.js';
import { episch } from '../darstellung.js';
import { bromSvg } from './brom-figur.js';
import { findeBild } from '../bilder.js';

const SCHLUESSEL = 'brom';

export function bromAn() {
  try { return localStorage.getItem(SCHLUESSEL) !== 'aus'; } catch { return true; }
}

export function setzeBromAn(an) {
  try { localStorage.setItem(SCHLUESSEL, an ? 'an' : 'aus'); } catch { /* nur diese Sitzung */ }
}

export { bromSvg, bromMarkup } from './brom-figur.js';

/** Brom-Porträt: KI-Bild (bilder/brom/portraet), sonst die gezeichnete Fassung. */
export function bromPortraet(groesse = 64) {
  const huelle = el('span', { class: 'brom-portraet', style: `width:${groesse}px;height:${groesse}px` }, bromSvg(groesse, 'portraet'));
  findeBild('brom/portraet').then((url) => {
    if (url) setze(huelle, el('img', { src: url, alt: 'Brom', width: groesse, height: groesse }));
  });
  return huelle;
}

const HEROLD_SAETZE = [
  (n, s) => `Hört, hört! „${n}“ ist errungen – Stufe ${s}.`,
  (n, s) => `Bei meinem Amboss: „${n}“, Stufe ${s}. Gut geschmiedet.`,
  (n, s) => `Das Feuer lodert höher: „${n}“ (${s}).`,
  (n, s) => `Kunde aus der Schmiede: „${n}“ in ${s}. Weiter so.`,
];

/**
 * Verkündet Neuigkeiten unten über der Navigation. Kein Dialog, blockiert nichts, verschwindet von selbst.
 * meldungen: [{ titel, text, farbe? }]
 */
export function zeigeHerold(meldungen) {
  if (!meldungen.length) return;
  document.querySelector('.herold')?.remove();
  const mitBrom = bromAn() && document.documentElement.dataset.stil !== 'schlicht';
  const karte = el('div', { class: `herold${mitBrom ? ' mit-brom' : ''}`, role: 'status', 'aria-live': 'polite' });
  const schliessen = () => { karte.classList.add('weg'); setTimeout(() => karte.remove(), 300); };
  const erste = meldungen.slice(0, 3);
  setze(karte,
    mitBrom ? el('div', { class: 'herold-brom' }, bromPortraet(60)) : el('div', { class: 'herold-icon' }, icon('pokal', 26)),
    el('div', { class: 'herold-text' },
      el('strong', {}, mitBrom ? 'Brom verkündet' : episch('Neuer Erfolg', 'Neuer Erfolg')),
      ...erste.map((m) => el('p', {}, m.farbe ? el('span', { class: 'herold-punkt', style: `background:${m.farbe}` }) : null, m.text)),
      meldungen.length > 3 ? el('p', { class: 'leise klein' }, `… und ${meldungen.length - 3} weitere`) : null,
      el('a', { href: '#/erfolge', class: 'klein', onclick: schliessen }, 'Ansehen →')),
    el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Schließen', onclick: schliessen }, icon('schliessen', 18)));
  document.body.append(karte);
  setTimeout(schliessen, 9000);
}

/** Text für einen neuen Erfolg (episch mit Brom, sonst schlicht). */
export function heroldSatz(name, stufe, index = 0) {
  return episch(HEROLD_SAETZE[index % HEROLD_SAETZE.length](name, stufe), `${name} – ${stufe}`);
}
