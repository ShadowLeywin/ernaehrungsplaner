// Formular für „Schnell eintragen“ und für Gerichte im Unterwegs-Rechner (eigene Datei, damit beide
// Blätter es nutzen, ohne sich gegenseitig zu importieren).

import { kcalAusMakros, pruefeSchnell } from '../logik/schnell.js';
import { SLOTS } from '../logik/ziele.js';
import { parseZahl } from '../logik/zutat.js';
import { el, zahl } from '../ui.js';

/**
 * Formular für „Schnell eintragen“ und für Unterwegs-Gerichte: Name, Kalorien, Makros freiwillig.
 * restaurants (Liste): zeigt ein Feld „Wo?“ mit Vorschlägen. slot null: keine Mahlzeit-Wahl.
 * pruefe: pruefeSchnell oder pruefeGericht. Fehler stehen am Feld, das Getippte bleibt stehen.
 */
export function schnellFormular({ werte = {}, slot = null, restaurants = null, nameText = 'Was war es?', namePlatzhalter = 'z. B. Mensa Pasta', pruefe = pruefeSchnell, speichernText, beiSpeichern, beiLoeschen = null }) {
  const felder = {};
  const fehlerOrt = {};
  const eingabe = (id, beschriftung, einheit, extra = {}) => {
    fehlerOrt[id] = el('p', { class: 'fehlertext', id: `f-schnell-${id}-fehler` });
    felder[id] = el('input', {
      id: `f-schnell-${id}`, name: id, autocomplete: 'off', value: werte[id] ?? '', 'aria-describedby': `f-schnell-${id}-fehler`,
      oninput: () => { fehlerOrt[id].textContent = ''; felder[id].removeAttribute('aria-invalid'); if (['protein', 'kh', 'fett'].includes(id)) zeigeMakroKcal(); }, ...extra,
    });
    return el('div', { class: 'feld' }, el('label', { for: `f-schnell-${id}` }, beschriftung),
      el('div', { class: 'eingabe' }, felder[id], einheit ? el('span', { class: 'einheit' }, einheit) : null), fehlerOrt[id]);
  };
  const zahlFeld = { inputmode: 'decimal', enterkeyhint: 'next' };
  // Was Elan aus den Makros rechnen würde, steht grau im leeren Kalorienfeld; der Hinweis „fehlt“ verschwindet dann
  const zeigeMakroKcal = () => {
    const makros = Object.fromEntries(['protein', 'kh', 'fett'].map((m) => [m, parseZahl(felder[m].value)]).filter(([, w]) => Number.isFinite(w) && w >= 0));
    felder.kcal.placeholder = Object.keys(makros).length ? `${zahl(kcalAusMakros(makros))} aus Makros` : '';
    if (Object.keys(makros).length && !felder.kcal.value.trim()) { fehlerOrt.kcal.textContent = ''; felder.kcal.removeAttribute('aria-invalid'); }
  };
  const slotWahl = el('select', { id: 'f-schnell-slot', name: 'slot' }, SLOTS.map((s) => el('option', { value: s.id, selected: s.id === slot }, s.name)));
  const vorschlaege = restaurants ? el('datalist', { id: 'f-schnell-restaurants' }, restaurants.map((r) => el('option', { value: r }))) : null;
  queueMicrotask(() => {
    zeigeMakroKcal();
    const leer = ['restaurant', 'name'].find((id) => felder[id] && !felder[id].value);
    (leer ? felder[leer] : felder.kcal).focus();
  });
  return el('form', {
    class: 'stapel schnell-formular', novalidate: true, 'aria-label': 'Schnell eintragen',
    onsubmit: async (e) => {
      e.preventDefault();
      const pruefung = pruefe(Object.fromEntries(Object.entries(felder).map(([id, f]) => [id, f.value])));
      if (!pruefung.ok) {
        for (const [id, text] of Object.entries(pruefung.fehler)) { fehlerOrt[id].textContent = text; felder[id].setAttribute('aria-invalid', 'true'); }
        felder[Object.keys(pruefung.fehler)[0]].focus();
        return;
      }
      await beiSpeichern(pruefung, slotWahl.value);
    },
  },
  restaurants ? eingabe('restaurant', 'Wo?', '', { placeholder: 'z. B. Imbiss am Bahnhof', maxlength: 40, list: 'f-schnell-restaurants', enterkeyhint: 'next' }) : null,
  vorschlaege,
  eingabe('name', nameText, '', { placeholder: namePlatzhalter, maxlength: 80, enterkeyhint: 'next' }),
  eingabe('kcal', 'Kalorien', 'kcal', zahlFeld),
  el('div', { class: 'makro-felder' },
    eingabe('protein', 'Eiweiß', 'g', zahlFeld), eingabe('kh', 'Kohlenh.', 'g', zahlFeld), eingabe('fett', 'Fett', 'g', zahlFeld)),
  el('p', { class: 'klein' }, 'Makros sind freiwillig. Lässt du die Kalorien leer, rechnet Elan sie aus den Makros.'),
  slot ? el('div', { class: 'feld' }, el('label', { for: 'f-schnell-slot' }, 'Mahlzeit'), slotWahl) : null,
  el('div', { class: 'knopfreihe' },
    beiLoeschen ? el('button', { type: 'button', class: 'knopf leise', onclick: beiLoeschen }, 'Löschen') : null,
    el('button', { type: 'submit', class: 'knopf' }, speichernText)));
}
