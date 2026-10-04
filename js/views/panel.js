// Einstellungs-Panel, das von unten hereinfährt. Wird vom Zahnrad oben rechts auf jeder Seite geöffnet.
import { el, setze, schalter } from '../ui.js';
import { icon } from '../icons.js';
import { THEMEN, MODI, STILE, ladeDarstellung, speichereDarstellung } from '../darstellung.js';
import { bromAn, setzeBromAn } from './brom.js';

export function oeffnePanel(titel, inhalt, beiSchliessen) {
  const dialog = el('dialog', { class: 'panel' });
  const schliessen = () => { dialog.close(); dialog.remove(); beiSchliessen?.(); };
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); schliessen(); });
  // Tippen auf den abgedunkelten Hintergrund schließt
  dialog.addEventListener('click', (e) => { if (e.target === dialog) schliessen(); });
  setze(dialog,
    el('div', { class: 'panel-blatt' },
      el('div', { class: 'panel-griff', 'aria-hidden': 'true' }),
      el('div', { class: 'dialog-kopf' },
        el('h2', {}, titel),
        el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Schließen', onclick: schliessen }, icon('schliessen'))),
      el('div', { class: 'panel-inhalt' }, inhalt)));
  document.body.append(dialog);
  dialog.showModal();
}

/** Themen, Hell/Dunkel und Stil – wirkt sofort, gilt nur für dieses Gerät. */
export function darstellungAuswahl() {
  const wurzel = el('div', { class: 'darstellung' });
  const zeichne = () => {
    const aktuell = ladeDarstellung();
    const waehle = (aenderung) => { speichereDarstellung({ ...aktuell, ...aenderung }); zeichne(); };
    const umschalter = (beschriftung, optionen, wert, schluessel, icons = {}) => el('div', { class: 'modus-reihe' },
      el('div', { class: 'umschalter', role: 'group', 'aria-label': beschriftung },
        ...Object.entries(optionen).map(([id, name]) => el('button', {
          type: 'button',
          class: wert === id ? 'aktiv' : '',
          'aria-pressed': String(wert === id),
          onclick: () => waehle({ [schluessel]: id }),
        }, icons[id] ? icon(icons[id], 16) : null, name))));
    setze(wurzel,
      el('div', { class: 'themen' }, ...Object.entries(THEMEN).map(([id, t]) => el('button', {
        class: `thema${aktuell.thema === id ? ' aktiv' : ''}`,
        type: 'button',
        'aria-pressed': String(aktuell.thema === id),
        onclick: () => waehle({ thema: id }),
      },
      el('span', { class: 'thema-kreis', style: `background:linear-gradient(135deg, ${t.farben[0]}, ${t.farben[1]})` }),
      t.name))),
      umschalter('Hell oder dunkel', MODI, aktuell.modus, 'modus', { system: 'system', hell: 'sonne', dunkel: 'mond' }),
      umschalter('Stil', STILE, aktuell.stil, 'stil', { episch: 'flamme', schlicht: 'mehr' }),
      el('p', { class: 'leise klein', style: 'text-align:center' },
        aktuell.stil === 'episch'
          ? 'Episch: Lagerfeuer, Mittelalter-Flair und Spiel-Elemente.'
          : 'Schlicht: dieselben Funktionen, nüchtern und modern.'));
  };
  zeichne();
  return wurzel;
}

/** Allgemeine Schnelleinstellungen – unter jeder Seiten-Einstellung und auf dem Hub. */
export function schnellEinstellungen() {
  return el('div', {},
    el('h2', { class: 'abschnitt' }, 'Darstellung'),
    darstellungAuswahl(),
    el('div', { style: 'margin-top:12px' },
      schalter(bromAn(), setzeBromAn, 'Brom, der Herold', el('span', { class: 'leise klein' }, ' – verkündet Erfolge in der App (nie als Push-Nachricht)'))),
    el('div', { class: 'knopfreihe', style: 'margin-top:16px' },
      el('a', { class: 'knopf zweitrangig', href: '#/einstellungen' }, icon('einstellungen', 18), 'Profil & Ziele'),
      el('a', { class: 'knopf zweitrangig', href: '#/backup' }, icon('backup', 18), 'Backup')));
}
