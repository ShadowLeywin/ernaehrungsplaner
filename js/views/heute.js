// Tagesansicht. Schritt 2: zeigt Tagestyp und Ziele. Einträge und Zähler folgen in Schritt 4.
import { el, zahl } from '../ui.js';
import { holeProfil } from '../state.js';
import { tagestypFuerDatum, mahlzeitenZiele } from '../logic/ziele.js';

const datumFormat = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

export const heute = {
  titel: 'Heute',
  render() {
    const wurzel = el('div');
    holeProfil().then((profil) => zeichne(wurzel, profil, new Date()));
    return wurzel;
  },
};

function zeichne(wurzel, profil, datum) {
  const { typ, notiz } = tagestypFuerDatum(profil, datum);
  const ziele = mahlzeitenZiele(typ, profil.mahlzeiten);

  wurzel.replaceChildren(
    el('section', { class: 'karte' },
      el('p', { class: 'leise klein' }, datumFormat.format(datum)),
      el('h2', {}, typ.name, notiz ? el('span', { class: 'marke' }, notiz) : null),
      el('p', { class: 'grosszahl' }, `${zahl(typ.kcal)} kcal`),
      el('div', { class: 'makroreihe' },
        makro('Protein', typ.protein),
        makro('KH', typ.kh),
        makro('Fett', typ.fett)),
      el('p', { class: 'leise klein' },
        `Gemüse ${zahl(typ.gemueseG)} g · Obst ${zahl(typ.obstG)} g · `
        + `Ballaststoffe ${typ.ballaststoffeMinG}–${typ.ballaststoffeMaxG} g · `
        + `Wasser bis Mittag ${zahl(typ.wasserBisMittagMl / 1000)} l`)),
    el('section', { class: 'karte' },
      el('h2', {}, 'Ziele pro Mahlzeit'),
      el('table', { class: 'tabelle' },
        el('thead', {}, el('tr', {}, ...['', 'kcal', 'P', 'KH', 'F'].map((t) => el('th', {}, t)))),
        el('tbody', {}, ...ziele.map((z) => el('tr', {},
          el('td', {}, z.name),
          ...[z.kcal, z.protein, z.kh, z.fett].map((w) => el('td', {}, zahl(w))))))),
      el('p', { class: 'leise klein' }, 'Morning Stack wird ab Schritt 3 vorher abgezogen.')),
  );
}

function makro(name, gramm) {
  return el('div', { class: 'makro' }, el('strong', {}, `${zahl(gramm)} g`), el('span', { class: 'leise' }, name));
}
