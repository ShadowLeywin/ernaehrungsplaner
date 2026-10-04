// Übungs-Info: Muskelkarte (Haupt- und Nebenmuskeln), Beschreibung, Funktion der Muskeln und Video zum Vormachen.
import { el, setze } from '../ui.js';
import { icon } from '../icons.js';
import { MUSKELN, EQUIPMENT } from '../daten/uebungen.js';
import { MUSKEL_INFO, uebungsBeschreibung } from '../daten/beschreibungen.js';
import { muskelMini } from './koerper.js';

export function oeffneUebungInfo(u, frau = false) {
  const dialog = el('dialog', { class: 'dialog' });
  const schliessen = () => { dialog.close(); dialog.remove(); };
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); schliessen(); });
  const muskeln = u.muskeln.filter((m) => MUSKELN[m] && m !== 'ausdauer' && m !== 'ganzkoerper');
  const karte = el('div', { class: 'muskel-mini' });
  karte.innerHTML = muskelMini(muskeln, frau);
  // Video-Suche öffnet nur den Übungsnamen – es werden keine persönlichen Daten übertragen
  const video = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${u.name} richtige Ausführung`)}`;
  setze(dialog,
    el('div', { class: 'dialog-kopf' }, el('h2', {}, u.name),
      el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Schließen', onclick: schliessen }, icon('schliessen'))),
    el('div', { class: 'dialog-inhalt' },
      muskeln.length ? karte : null,
      muskeln.length ? el('p', { class: 'klein legende-muskel' },
        el('span', { class: 'punkt stark' }), ' Hauptmuskel ', el('span', { class: 'punkt schwach' }), ' Mitarbeit') : null,
      el('p', {}, uebungsBeschreibung(u)),
      u.equipment && EQUIPMENT[u.equipment] ? el('p', { class: 'leise klein' }, `Ausrüstung: ${EQUIPMENT[u.equipment]}`) : null,
      muskeln.length ? el('ul', { class: 'liste-einfach' }, ...muskeln.map((m, i) => el('li', {},
        el('strong', {}, `${MUSKELN[m]}${i === 0 ? ' (Haupt)' : ''}`),
        MUSKEL_INFO[m] ? el('p', { class: 'leise klein' }, `${MUSKEL_INFO[m].latein} – ${MUSKEL_INFO[m].text}`) : null))) : null,
      el('a', { class: 'knopf zweitrangig voll', href: video, target: '_blank', rel: 'noopener' }, icon('weiter', 18), 'Ausführung im Video ansehen'),
      el('p', { class: 'leise klein' }, 'Öffnet YouTube mit dem Übungsnamen (nur online).')));
  document.body.append(dialog);
  dialog.showModal();
}
