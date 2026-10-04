// Mehr-Menü: alle weiteren Bereiche, nach Themen gruppiert.
import { el } from '../ui.js';
import { icon } from '../icons.js';
import { episch } from '../darstellung.js';

const GRUPPEN = () => [
  [episch('Taverne & Vorrat', 'Ernährung'), [
    ['rezepte', 'rezepte', episch('Rezeptbuch', 'Rezepte'), 'Bewertet & eintragbar'],
    ['mealprep', 'mealprep', 'Meal-Prep', 'Portionen rechnen'],
    ['einkauf', 'einkauf', 'Einkauf', 'Liste aus dem Plan'],
    ['angebote', 'angebote', 'Angebote', 'Märkte der Woche'],
    ['vorlieben', 'lebensmittel', 'Vorlieben', 'Obst & Gemüse 0–10'],
    ['lebensmittel', 'lebensmittel', 'Lebensmittel', 'Suchen & Barcode'],
  ]],
  [episch('Übungsplatz', 'Training'), [
    ['fortschritt', 'hoch', 'Fortschritt', 'Rekorde & Verlauf'],
    ['koerper', 'koerper', 'Körper', 'Muskeln & Übungen'],
    ['gewicht', 'gewicht', 'Gewicht', 'Verlauf & Anpassung'],
  ]],
  [episch('Heldenreise', 'Spiel & Erinnerung'), [
    ['held', 'schild', episch('Heldenbogen', 'Charakter'), 'Werte, Level, Ränge'],
    ['erfolge', 'pokal', 'Erfolge', 'Stufen & Geheimes'],
    ['freunde', 'freunde', 'Freunde', 'Rangkarten vergleichen'],
    ['tagebuch', 'buch', 'Tagebuch', 'Chronik deiner Tage'],
  ]],
  ['Einstellungen', [
    ['einstellungen', 'einstellungen', 'Profil', 'Ziele, Sport, Design'],
    ['backup', 'backup', 'Backup', 'Sichern & laden'],
  ]],
];

function mehrAnsicht() {
  return el('div', {}, ...GRUPPEN().map(([titel, eintraege]) => el('section', {},
    el('h2', { class: 'abschnitt' }, titel),
    el('div', { class: 'kacheln' }, ...eintraege.map(([route, iconName, name, text]) => el('a', { class: 'kachel', href: `#/${route}` },
      el('span', { class: 'kachel-icon' }, icon(iconName)),
      el('div', {}, el('strong', {}, name), el('br'), el('span', {}, text))))))));
}

export const mehr = { titel: 'Mehr', render: mehrAnsicht };
