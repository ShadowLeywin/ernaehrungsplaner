// Lebensmittel-Datenbank durchsuchen und Nährwerte je 100 g ansehen.
import { el, setze, zahl } from '../ui.js';
import { holeLebensmittel, sucheLebensmittel } from '../lebensmittel.js';
import { NAEHRSTOFFE, KATEGORIEN, istUnvollstaendig } from '../logic/naehrstoffe.js';

const GRUPPEN = { makro: 'Makronährstoffe', fett: 'Fettsäuren', vitamin: 'Vitamine', mineral: 'Mineralstoffe' };

export const lebensmittel = {
  titel: 'Lebensmittel',
  reiter: 'mehr',
  render() {
    const wurzel = el('div', {}, el('p', { class: 'leise' }, 'Lade …'));
    holeLebensmittel()
      .then((daten) => zeichne(wurzel, daten))
      .catch((fehler) => setze(wurzel, el('p', { class: 'warnung' }, fehler.message)));
    return wurzel;
  },
};

function zeichne(wurzel, daten) {
  const liste = el('div');
  const suche = el('input', {
    type: 'search',
    placeholder: `In ${daten.lebensmittel.length} Lebensmitteln suchen …`,
    'aria-label': 'Lebensmittel suchen',
    oninput: () => zeigeListe(),
  });

  const zeigeListe = () => {
    const treffer = sucheLebensmittel(daten.lebensmittel, suche.value);
    const nachKategorie = Object.keys(KATEGORIEN)
      .map((k) => [k, treffer.filter((l) => l.kategorie === k)])
      .filter(([, eintraege]) => eintraege.length);
    setze(liste,
      ...(treffer.length ? [] : [el('p', { class: 'leise' }, 'Nichts gefunden.')]),
      ...nachKategorie.map(([k, eintraege]) => el('section', {},
        el('h2', { class: 'abschnitt' }, `${KATEGORIEN[k]} (${eintraege.length})`),
        el('div', { class: 'karte', style: 'padding:0' }, ...eintraege.map(eintragDetails)))),
    );
  };

  setze(wurzel, el('div', { class: 'suchleiste' }, suche), liste);
  zeigeListe();
}

function eintragDetails(l) {
  const w = l.je100g;
  return el('details', { class: 'lm' },
    el('summary', {},
      el('span', { class: 'lm-name' }, l.name),
      el('span', { class: 'leise klein' }, `${zahl(w.kcal)} kcal · P ${zahl(w.protein)} · KH ${zahl(w.kh)} · F ${zahl(w.fett)}`)),
    el('div', { class: 'lm-inhalt' },
      el('p', { class: 'leise klein' },
        'Je 100 g',
        l.stueckG ? ` · 1 Stück ≈ ${l.stueckG} g` : '',
        ` · Quelle: ${l.quelle === 'usda_sr' ? 'USDA' : 'Richtwert, mit Packung abgleichen'}`),
      istUnvollstaendig(w) ? el('p', { class: 'warnung klein' }, 'Mikronährstoffe unvollständig') : null,
      ...Object.entries(GRUPPEN).map(([gruppe, titel]) => naehrstoffTabelle(w, gruppe, titel))));
}

function naehrstoffTabelle(w, gruppe, titel) {
  const zeilen = Object.entries(NAEHRSTOFFE)
    .filter(([k, n]) => n.gruppe === gruppe && w[k] != null)
    .map(([k, n]) => el('tr', {}, el('td', {}, n.name), el('td', {}, `${zahl(w[k])} ${n.einheit}`)));
  if (!zeilen.length) return null;
  return el('table', { class: 'tabelle' },
    el('thead', {}, el('tr', {}, el('th', {}, titel), el('th', {}, ''))),
    el('tbody', {}, ...zeilen));
}
