// Mehr-Menü und Platzhalter für Bereiche, die in späteren Schritten kommen.
import { el } from '../ui.js';
import { icon } from '../icons.js';

function platzhalter(titel, iconName, text, reiter) {
  return {
    titel,
    reiter,
    render: () => el('section', { class: 'karte willkommen' },
      el('div', { class: 'logo' }, icon(iconName, 34)),
      el('h2', {}, titel),
      el('p', { class: 'leise' }, text)),
  };
}

const MEHR = [
  ['gewicht', 'gewicht', 'Gewicht', 'Verlauf & Anpassung'],
  ['lebensmittel', 'lebensmittel', 'Lebensmittel', 'Nährwerte suchen'],
  ['einstellungen', 'einstellungen', 'Profil', 'Ziele, Sport, Design'],
  ['backup', 'backup', 'Backup', 'Sichern & laden'],
  ['angebote', 'angebote', 'Angebote', 'Märkte der Woche'],
  ['mealprep', 'mealprep', 'Meal-Prep', 'Portionen rechnen'],
];

function mehrAnsicht() {
  return el('div', { class: 'kacheln' }, ...MEHR.map(([route, iconName, titel, text]) => el('a', { class: 'kachel', href: `#/${route}` },
    el('span', { class: 'kachel-icon' }, icon(iconName)),
    el('div', {}, el('strong', {}, titel), el('br'), el('span', {}, text)))));
}

export const ansichten = {
  woche: platzhalter('Woche', 'woche', 'Der Wochenplaner kommt in einem der nächsten Schritte.'),
  rezepte: platzhalter('Rezepte', 'rezepte', 'Rezepte mit Bewertung, Geschmack und Vorteilen kommen als Nächstes.'),
  einkauf: platzhalter('Einkauf', 'einkauf', 'Die Einkaufsliste entsteht später automatisch aus dem Wochenplan.'),
  mehr: { titel: 'Mehr', render: mehrAnsicht },
  angebote: platzhalter('Angebote', 'angebote', 'Die Angebote der Märkte kommen in einem späteren Schritt.', 'mehr'),
  mealprep: platzhalter('Meal-Prep', 'mealprep', 'Gesamtgewicht ÷ Portionen – kommt zusammen mit den Rezepten.', 'mehr'),
};
