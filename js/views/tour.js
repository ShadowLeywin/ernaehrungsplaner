// Einführungs-Tour nach der Ersteinrichtung: vier kurze Seiten mit Brom. Später im Zahnrad erneut abrufbar.
import { el, setze } from '../ui.js';
import { icon } from '../icons.js';
import { episch } from '../darstellung.js';
import { bromPortraet } from './brom.js';

const SCHLUESSEL = 'tourGesehen';

const SEITEN = () => [
  { icon: 'feuer', titel: episch('Willkommen im Lager', 'Startseite'), text: episch(
    'Ich bin Brom. Hier am Feuer siehst du alles Wichtige des Tages. Das Feuer wächst mit deiner Serie, das Lager mit deinem Level – und mit Erz und Glut baust du es selbst aus.',
    'Die Startseite zeigt das Wichtigste des Tages: Kalorien, Training, Wasser, Gewicht, dazu Level, Aufträge und Ausbau.') },
  { icon: 'lebensmittel', titel: episch('Die Taverne', 'Ernährung'), text:
    'Trag dein Essen pro Mahlzeit ein. Tipp: Erst alles mit „+“ ohne Menge eintragen und die Mengen dann über ✎ gesammelt ergänzen – auch per Diktat. Favoriten ★ und „Wie gestern“ sparen Zeit.' },
  { icon: 'hantel', titel: episch('Der Übungsplatz', 'Training'), text:
    'Starte Workouts aus deinen Vorlagen. Die App merkt sich das letzte Mal, schlägt Steigerungen vor, rechnet Scheiben und Aufwärmsätze. Rekorde, Ränge und Erfolge kommen von allein.' },
  { icon: 'woche', titel: 'Woche & Mehr', text:
    'Im Wochenplan planst du Mahlzeiten, die Einkaufsliste entsteht automatisch – mit Angeboten deiner Märkte. Unter „Mehr“: Rezepte, Maße & Fotos, Tagebuch, Freunde und das Backup. Mach regelmäßig ein Backup!' },
];

export function tourGesehen() {
  try { return localStorage.getItem(SCHLUESSEL) === 'ja'; } catch { return true; }
}

export function zeigeTour() {
  const seiten = SEITEN();
  let i = 0;
  const dialog = el('dialog', { class: 'dialog tour' });
  const schliessen = () => {
    try { localStorage.setItem(SCHLUESSEL, 'ja'); } catch { /* egal */ }
    dialog.close();
    dialog.remove();
  };
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); schliessen(); });
  const zeichne = () => {
    const s = seiten[i];
    setze(dialog, el('div', { class: 'dialog-inhalt tour-inhalt' },
      el('div', { class: 'tour-kopf' }, bromPortraet(72), el('span', { class: 'kachel-icon' }, icon(s.icon))),
      el('h2', {}, s.titel),
      el('p', {}, s.text),
      el('div', { class: 'schritt-punkte' }, ...seiten.map((_, n) => el('i', { class: n <= i ? 'an' : '' }))),
      el('div', { class: 'knopfreihe' },
        el('button', { class: 'knopf zweitrangig', type: 'button', onclick: schliessen }, 'Überspringen'),
        el('button', { class: 'knopf', type: 'button', onclick: () => { if (i < seiten.length - 1) { i += 1; zeichne(); } else schliessen(); } },
          i < seiten.length - 1 ? 'Weiter' : 'Los geht’s'))));
  };
  document.body.append(dialog);
  zeichne();
  dialog.showModal();
}
