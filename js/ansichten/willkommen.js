// Ersteinrichtung: drei kurze Schritte beim allerersten Start, dann direkt zum ersten Eintrag.
// Ob sie schon gezeigt wurde, merkt sich das Gerät (localStorage), wie die Darstellung.

import { APP_NAME } from '../logik/schema.js';
import { GESCHLECHTER } from '../logik/referenz.js';
import { TAGESTYPEN, skaliereZiel } from '../logik/ziele.js';
import { parseZahl } from '../logik/zutat.js';
import { gehe } from '../router.js';
import * as speicher from '../speicher.js';
import { el, feld, haenge, hinweis } from '../ui.js';

const SCHLUESSEL = 'elan.eingerichtet';

export function istEingerichtet() {
  try { return localStorage.getItem(SCHLUESSEL) === '1'; } catch { return true; } // ohne Speicher lieber nicht bei jedem Start fragen
}

export function merkeEingerichtet() {
  try { localStorage.setItem(SCHLUESSEL, '1'); } catch { /* dann eben beim nächsten Start noch einmal */ }
}

let schritt = 1;

export async function zeigeWillkommen(wurzel) {
  document.title = `Willkommen – ${APP_NAME}`;
  const punkte = el('p', { class: 'schritt-punkte', 'aria-label': `Schritt ${schritt} von 3` }, [1, 2, 3].map((n) => el('span', { class: n <= schritt ? 'an' : null })));
  const weiter = (n) => { schritt = n; wurzel.replaceChildren(); zeigeWillkommen(wurzel); window.scrollTo(0, 0); };
  const fertig = () => { merkeEingerichtet(); schritt = 1; gehe('/heute'); };

  if (schritt === 1) {
    return haenge(wurzel, el('div', { class: 'willkommen stapel' },
      punkte,
      el('h1', {}, `Willkommen bei ${APP_NAME}`),
      el('p', { class: 'gross' }, 'Du trägst ein, was du isst. Elan zeigt dir, wie nah du an deinen Zielen bist, und behält Gewicht, Schlaf und andere Werte im Blick.'),
      el('ul', { class: 'vorteile' },
        el('li', {}, el('strong', {}, 'Alles bleibt auf dem Handy. '), 'Kein Konto, kein Server, keine Werbung.'),
        el('li', {}, el('strong', {}, 'Schnell eintragen. '), 'Zuletzt Gegessenes geht mit einem Tipp.'),
        el('li', {}, el('strong', {}, 'Ziele je Tagestyp. '), 'Gym, Calisthenics und Rest haben eigene Ziele.')),
      el('div', { class: 'knopfreihe' },
        el('a', { class: 'knopf leise', href: '#/mehr/backup', onclick: () => merkeEingerichtet() }, 'Backup einspielen'),
        el('button', { type: 'button', class: 'knopf', onclick: () => weiter(2) }, 'Los geht’s'))));
  }

  if (schritt === 2) {
    const ziele = await speicher.ladeZiele();
    const eingabe = Object.fromEntries(TAGESTYPEN.map((t) => [t.id, String(ziele[t.id].kcal)]));
    const fehler = el('p', { class: 'fehlertext', role: 'alert' });
    const speichern = async () => {
      const neu = {};
      for (const t of TAGESTYPEN) {
        const kcal = parseZahl(eingabe[t.id]);
        if (kcal === null || Number.isNaN(kcal) || kcal < 800 || kcal > 8000) { fehler.textContent = `${t.name}: eine Zahl von 800 bis 8.000.`; return; }
        neu[t.id] = kcal === ziele[t.id].kcal ? ziele[t.id] : skaliereZiel(ziele[t.id], kcal);
      }
      await speicher.setzeEinstellung('ziele', neu);
      weiter(3);
    };
    return haenge(wurzel, el('div', { class: 'willkommen stapel' },
      punkte,
      el('h1', {}, 'Deine Energieziele'),
      el('p', {}, 'Wie viel willst du an welchem Tagestyp essen? Die Startwerte sind Platzhalter. Eiweiß bleibt gleich, Kohlenhydrate und Fett passt Elan an. Genauer geht es später unter Mehr → Ziele.'),
      el('div', { class: 'stapel' }, TAGESTYPEN.map((t) => feld({
        name: `start-${t.id}`, beschriftung: t.name, einheit: 'kcal', inputmode: 'numeric', value: eingabe[t.id],
        oninput: (e) => { eingabe[t.id] = e.target.value; },
      }))),
      fehler,
      el('div', { class: 'knopfreihe' },
        el('button', { type: 'button', class: 'knopf leise', onclick: () => weiter(3) }, 'Startwerte lassen'),
        el('button', { type: 'button', class: 'knopf', onclick: speichern }, 'Weiter'))));
  }

  const { daten } = await speicher.ladeReferenz();
  const wahl = { geschlecht: '', alter: '' };
  const auswahl = (id, beschriftung, optionen, schluessel) => el('div', { class: 'feld' },
    el('label', { for: id }, beschriftung),
    el('select', { id, onchange: (e) => { wahl[schluessel] = e.target.value; } },
      el('option', { value: '' }, 'Keine Angabe'),
      optionen.map((o) => el('option', { value: o.id }, o.name))));
  return haenge(wurzel, el('div', { class: 'willkommen stapel' },
    punkte,
    el('h1', {}, 'Vitamine und Mineralstoffe'),
    el('p', {}, 'Für den Vergleich mit den Referenzwerten der DGE braucht Elan Geschlecht und Alter. Die Angabe bleibt auf dem Handy und ist freiwillig.'),
    daten ? el('div', { class: 'raster' }, auswahl('f-start-geschlecht', 'Geschlecht', GESCHLECHTER, 'geschlecht'), auswahl('f-start-alter', 'Alter', daten.altersgruppen, 'alter')) : null,
    el('div', { class: 'knopfreihe' },
      el('button', { type: 'button', class: 'knopf leise', onclick: fertig }, 'Überspringen'),
      el('button', {
        type: 'button', class: 'knopf',
        onclick: async () => {
          if (wahl.geschlecht && wahl.alter) await speicher.setzeEinstellung('referenzgruppe', { ...wahl });
          fertig();
          hinweis('Fertig. Tippe bei einer Mahlzeit auf das Plus.');
        },
      }, 'Fertig'))));
}

