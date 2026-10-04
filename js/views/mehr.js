// Mehr-Menü: alle weiteren Bereiche, nach Themen gruppiert.
import { el } from '../ui.js';
import { icon } from '../icons.js';
import { episch } from '../darstellung.js';

// Einkauf, Angebote und Vorlieben liegen im Wochenplan, Fortschritt und Körper im Training.
const GRUPPEN = () => [
  [episch('Taverne & Vorrat', 'Ernährung'), [
    ['rezepte', 'rezepte', episch('Rezeptbuch', 'Rezepte'), 'Bewertet & eintragbar'],
    ['mealprep', 'mealprep', 'Meal-Prep', 'Portionen rechnen'],
    ['lebensmittel', 'lebensmittel', 'Lebensmittel', 'Suchen & Barcode'],
  ]],
  [episch('Heldenreise', 'Spiel & Erinnerung'), [
    ['held', 'schild', episch('Heldenbogen', 'Charakter'), 'Werte, Level, Ränge'],
    ['erfolge', 'pokal', 'Erfolge', 'Stufen & Geheimes'],
    ['freunde', 'freunde', 'Freunde', 'Rangkarten vergleichen'],
    ['tagebuch', 'buch', 'Tagebuch', 'Chronik deiner Tage'],
    ['geschichte', 'feuer', episch('Brom erzählt', 'Geschichte'), 'Kapitel nach Level'],
    ['rueckblick', 'stern', 'Rückblick', 'Monat & Jahr'],
  ]],
  ['Körper & Einstellungen', [
    ['gewicht', 'gewicht', 'Gewicht', 'Verlauf & Anpassung'],
    ['masse', 'koerper', 'Maße & Fotos', 'Prognose & Phasen-Bericht'],
    ['einstellungen', 'einstellungen', 'Profil', 'Ziele, Sport, Design'],
    ['backup', 'backup', 'Backup', 'Sichern & teilen'],
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
