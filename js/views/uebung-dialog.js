// Dialog: Übung oder Aktivität aus der Datenbank wählen – Suche plus Filter nach Kategorie und Muskel.
import { el, setze } from '../ui.js';
import { icon } from '../icons.js';
import { UEBUNGEN, KATEGORIEN, MUSKELN, EQUIPMENT } from '../daten/uebungen.js';
import { normalisiere } from '../lebensmittel.js';

/**
 * optionen: { titel, kategorien?: [ids] (Vorauswahl/Einschränkung), beiAuswahl(uebung) }
 */
export function oeffneUebungDialog(optionen) {
  const erlaubt = optionen.kategorien ?? Object.keys(KATEGORIEN);
  let kategorie = erlaubt.length === 1 ? erlaubt[0] : null;
  let muskel = null;

  const dialog = el('dialog', { class: 'dialog' });
  const schliessen = () => { dialog.close(); dialog.remove(); };
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); schliessen(); });
  document.body.append(dialog);

  const liste = el('ul', { class: 'liste auswahl' });
  const filterBereich = el('div', { class: 'filter' });
  const suche = el('input', {
    type: 'search',
    placeholder: 'Übung suchen …',
    'aria-label': 'Übung suchen',
    oninput: () => zeigeTreffer(),
  });

  const chip = (text, an, beiKlick) => el('button', {
    class: `chip${an ? ' an' : ''}`, type: 'button', 'aria-pressed': String(an), onclick: beiKlick,
  }, text);

  const zeigeFilter = () => {
    const kraftErlaubt = erlaubt.includes('gym') || erlaubt.includes('calisthenics');
    const kraftKategorie = kraftErlaubt && (!kategorie || kategorie === 'gym' || kategorie === 'calisthenics');
    setze(filterBereich,
      erlaubt.length > 1 ? el('div', { class: 'chips scroll' },
        chip('Alle', !kategorie, () => { kategorie = null; zeigeFilter(); zeigeTreffer(); }),
        ...erlaubt.map((k) => chip(KATEGORIEN[k], kategorie === k, () => { kategorie = k; muskel = null; zeigeFilter(); zeigeTreffer(); })))
        : null,
      kraftKategorie ? el('div', { class: 'chips scroll' },
        ...Object.entries(MUSKELN).filter(([m]) => m !== 'ausdauer').map(([m, name]) => chip(name, muskel === m, () => {
          muskel = muskel === m ? null : m;
          zeigeFilter();
          zeigeTreffer();
        })))
        : null);
  };

  const zeigeTreffer = () => {
    const begriffe = normalisiere(suche.value).split(/\s+/).filter(Boolean);
    const treffer = UEBUNGEN.filter((u) => erlaubt.includes(u.kategorie)
      && (!kategorie || u.kategorie === kategorie)
      && (!muskel || u.muskeln.includes(muskel))
      && begriffe.every((b) => normalisiere(u.name).includes(b)));
    setze(liste,
      treffer.length ? null : el('li', { class: 'leise', style: 'padding:16px' }, 'Nichts gefunden.'),
      ...treffer.slice(0, 120).map((u) => el('li', {},
        el('button', { type: 'button', class: 'auswahl-eintrag', onclick: () => { schliessen(); optionen.beiAuswahl(u); } },
          el('span', {}, u.name),
          el('span', { class: 'leise klein' }, u.met
            ? KATEGORIEN[u.kategorie]
            : `${u.muskeln.map((m) => MUSKELN[m]).join(', ')} · ${EQUIPMENT[u.equipment]}`)))));
  };

  setze(dialog,
    el('div', { class: 'dialog-kopf' },
      el('h2', {}, optionen.titel),
      el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Schließen', onclick: schliessen }, icon('schliessen'))),
    el('div', { class: 'dialog-inhalt' }, suche, filterBereich, liste));
  zeigeFilter();
  zeigeTreffer();
  dialog.showModal();
  suche.focus();
}
