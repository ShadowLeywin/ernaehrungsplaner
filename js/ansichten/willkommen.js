// Ersteinrichtung: drei kurze Schritte beim allerersten Start, dann direkt zum ersten Eintrag.
// Ob sie schon gezeigt wurde, merkt sich das Gerät (localStorage), wie die Darstellung.

import { APP_NAME } from '../logik/schema.js';
import { GESCHLECHTER } from '../logik/referenz.js';
import { MAX_TAGESTYPEN, MAX_TYPNAME, STANDARD_ZIELE, TAGESTYPEN, neueTypKennung, pruefeTagestypen, skaliereZiel } from '../logik/ziele.js';
import { parseZahl } from '../logik/zutat.js';
import { gehe } from '../router.js';
import * as speicher from '../speicher.js';
import { el, feld, haenge, hinweis, icon } from '../ui.js';

const SCHLUESSEL = 'elan.eingerichtet';

export function istEingerichtet() {
  try { return localStorage.getItem(SCHLUESSEL) === '1'; } catch { return true; } // ohne Speicher lieber nicht bei jedem Start fragen
}

export function merkeEingerichtet() {
  try { localStorage.setItem(SCHLUESSEL, '1'); } catch { /* dann eben beim nächsten Start noch einmal */ }
}

let schritt = 1;
let entwurf = null;

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
        el('li', {}, el('strong', {}, 'Ziele je Tagestyp. '), 'Training, Ruhetag oder was du willst: Namen und Anzahl wählst du selbst.')),
      el('div', { class: 'knopfreihe' },
        el('a', { class: 'knopf leise', href: '#/mehr/backup', onclick: () => merkeEingerichtet() }, 'Backup einspielen'),
        el('button', { type: 'button', class: 'knopf', onclick: () => weiter(2) }, 'Los geht’s'))));
  }

  if (schritt === 2) {
    const ziele = await speicher.ladeZiele();
    // Entwurf über ein Neuzeichnen hinweg (Typ dazu oder weg): Namen und kcal bleiben stehen
    entwurf ??= TAGESTYPEN.map((t) => ({ id: t.id, name: t.name, kcal: String(ziele[t.id]?.kcal ?? STANDARD_ZIELE.calisthenics.kcal) }));
    const fehler = el('p', { class: 'fehlertext', role: 'alert' });
    const neuZeichnenSchritt = () => weiter(2);
    const speichern = async () => {
      const pruefung = pruefeTagestypen(entwurf);
      if (!pruefung.ok) { fehler.textContent = pruefung.fehler; return; }
      const neu = {};
      for (const t of entwurf) {
        const kcal = parseZahl(t.kcal);
        if (kcal === null || Number.isNaN(kcal) || kcal < 800 || kcal > 8000) { fehler.textContent = `${t.name}: eine Zahl von 800 bis 8.000.`; return; }
        const basis = ziele[t.id] ?? STANDARD_ZIELE[t.id] ?? STANDARD_ZIELE.calisthenics;
        neu[t.id] = kcal === basis.kcal ? basis : skaliereZiel(basis, kcal);
      }
      await speicher.setzeEinstellung('tagestypen', pruefung.typen.map(({ id, name }) => ({ id, name })));
      await speicher.setzeEinstellung('ziele', neu);
      entwurf = null;
      weiter(3);
    };
    const zeile = (t) => el('div', { class: 'typ-zeile' },
      feld({ name: `typname-${t.id}`, beschriftung: 'Name', value: t.name, maxlength: MAX_TYPNAME, oninput: (e) => { t.name = e.target.value; } }),
      feld({ name: `start-${t.id}`, beschriftung: 'Energie', einheit: 'kcal', inputmode: 'numeric', value: t.kcal, oninput: (e) => { t.kcal = e.target.value; } }),
      entwurf.length > 1 ? el('button', {
        type: 'button', class: 'rund', 'aria-label': `${t.name || 'Tagestyp'} entfernen`,
        onclick: () => { entwurf = entwurf.filter((x) => x !== t); neuZeichnenSchritt(); },
      }, icon('zu', 20)) : null);
    return haenge(wurzel, el('div', { class: 'willkommen stapel' },
      punkte,
      el('h1', {}, 'Deine Tagestypen'),
      el('p', {}, 'An welchen Arten von Tagen isst du unterschiedlich viel? Benenne sie, wie du willst (zum Beispiel Training, Lauf, Ruhetag), und gib jedem ein Energieziel. Eiweiß bleibt gleich, Kohlenhydrate und Fett passt Elan an. Ändern geht später unter Mehr → Wochenplan und Mehr → Ziele.'),
      el('div', { class: 'stapel', id: 'start-typen' }, entwurf.map(zeile)),
      entwurf.length < MAX_TAGESTYPEN ? el('button', {
        type: 'button', class: 'knopf leise', onclick: () => { entwurf.push({ id: neueTypKennung(entwurf), name: '', kcal: String(STANDARD_ZIELE.calisthenics.kcal) }); neuZeichnenSchritt(); },
      }, icon('plus', 18), 'Tagestyp') : null,
      fehler,
      el('div', { class: 'knopfreihe' },
        el('button', { type: 'button', class: 'knopf leise', onclick: () => { entwurf = null; weiter(3); } }, 'Startwerte lassen'),
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

