// Rezept importieren: eingefügten oder geteilten Text lesen, Vorschlag zeigen, ins Rezeptformular übernehmen.
// Die App ruft dabei keine fremden Seiten ab; verarbeitet wird nur, was eingefügt oder geteilt wurde.

import { alsVorlage, leseRezept, ordneZu } from '../logik/import.js';
import { APP_NAME } from '../logik/schema.js';
import { gehe } from '../router.js';
import * as speicher from '../speicher.js';
import { el, haenge, icon, zahl } from '../ui.js';

export const GETEILT_SCHLUESSEL = 'elan.geteilt';

// Der Entwurf wandert einmalig von hier ins Rezeptformular
let entwurf = null;
/** Ein Rezept ohne id als Vorlage für das Formular hinterlegen (Import, Kopie) */
export function setzeEntwurf(rezept) {
  entwurf = rezept;
}

export function nimmEntwurf() {
  const e = entwurf;
  entwurf = null;
  return e;
}

let text = '';

export async function zeigeImport(wurzel) {
  const zutaten = await speicher.alleZutaten();
  document.title = `Rezept importieren – ${APP_NAME}`;
  // Über das Teilen-Menü von Android hereingekommener Text (siehe js/main.js)
  try {
    const geteilt = sessionStorage.getItem(GETEILT_SCHLUESSEL);
    if (geteilt) { text = geteilt; sessionStorage.removeItem(GETEILT_SCHLUESSEL); }
  } catch { /* ohne Speicherzugriff bleibt das Feld leer */ }

  const ergebnis = el('div', { class: 'stapel', id: 'import-ergebnis', 'aria-live': 'polite' });
  const feldText = el('textarea', {
    id: 'f-import-text', rows: 9, 'aria-label': 'Rezepttext',
    placeholder: 'Rezept hier einfügen. Am besten mit den Überschriften „Zutaten“ und „Zubereitung“.',
    oninput: (e) => { text = e.target.value; },
  }, text);

  const erkenne = () => {
    const eingabe = text.trim();
    if (!eingabe) { ergebnis.replaceChildren(el('p', { class: 'fehlertext', role: 'alert' }, 'Füge zuerst einen Rezepttext ein.')); feldText.focus(); return; }
    if (/^https?:\/\/\S+$/.test(eingabe)) {
      ergebnis.replaceChildren(el('p', { class: 'merkzettel' }, 'Das ist nur eine Adresse. Die App ruft keine fremden Seiten ab. Öffne die Seite, kopiere den Rezepttext und füge ihn hier ein.'));
      return;
    }
    const { quelle, rezept } = leseRezept(eingabe);
    if (!rezept.zutaten.length && !rezept.schritte.length) {
      ergebnis.replaceChildren(el('p', { class: 'merkzettel' }, 'Darin habe ich kein Rezept erkannt. Am besten klappt es mit den Überschriften „Zutaten“ und „Zubereitung“ und einer Zutat je Zeile.'));
      return;
    }
    const zugeordnet = ordneZu(rezept.zutaten, zutaten);
    const gefunden = zugeordnet.filter((z) => z.treffer).length;
    const zusatz = (z) => {
      if (!z.treffer) return 'nicht gefunden, bitte im Formular von Hand ergänzen';
      const menge = z.gramm === null ? 'Menge fehlt' : `${zahl(z.gramm, 1)} g${z.unsicher ? ' (geschätzt)' : ''}`;
      return `wird zu ${z.treffer.name}, ${menge}`;
    };
    ergebnis.replaceChildren(
      el('h2', {}, rezept.name || 'Rezept ohne Namen'),
      el('p', { class: 'klein' }, [
        quelle === 'schema' ? 'Gelesen aus den Rezeptdaten der Seite.' : 'Gelesen aus dem Text.',
        rezept.portionen ? `${zahl(rezept.portionen, 1)} Portionen.` : 'Portionen nicht gefunden, Startwert ist 4.',
        `${gefunden} von ${zugeordnet.length} Zutaten zugeordnet, ${rezept.schritte.length} ${rezept.schritte.length === 1 ? 'Schritt' : 'Schritte'}.`,
      ].join(' ')),
      zugeordnet.length ? el('ul', { class: 'zeilen' }, zugeordnet.map((z) => el('li', { class: z.treffer ? 'zeile' : 'zeile offen' },
        el('span', { class: 'zeile-name' }, z.roh, el('small', {}, zusatz(z)))))) : null,
      el('p', { class: 'klein' }, 'Das ist ein Vorschlag. Im Formular prüfst du Zutaten und Mengen, bevor du speicherst.'),
      el('div', { class: 'knopfreihe' }, el('button', {
        type: 'button', class: 'knopf',
        onclick: () => { entwurf = alsVorlage(rezept, zugeordnet); text = ''; gehe('/rezepte/neu'); },
      }, 'Ins Rezeptformular übernehmen')));
  };

  haenge(wurzel,
    el('a', { class: 'zurueck', href: '#/rezepte' }, icon('zurueck', 18), 'Rezepte'),
    el('header', { class: 'detailkopf' },
      el('h1', {}, 'Rezept importieren'),
      el('p', {}, 'Füge den Text eines Rezepts ein oder teile ihn aus einer anderen App mit Elan.')),
    feldText,
    el('div', { class: 'knopfreihe' }, el('button', { type: 'button', class: 'knopf', onclick: erkenne }, 'Rezept erkennen')),
    ergebnis);
  // Geteilter Text: gleich zeigen, was erkannt wird
  if (text.trim()) erkenne();
}
