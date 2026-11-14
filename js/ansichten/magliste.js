// Mag-Liste: für jedes Obst und Gemüse festhalten, ob und in welcher Form man es isst.
// Die Angaben steuern Suchlisten (Abgelehntes rutscht ans Ende) und künftige Vorschläge.

import { APP_NAME } from '../logik/schema.js';
import { MAG, istObstGemuese } from '../logik/vorlieben.js';
import { kategorieName } from '../logik/zutat.js';
import { neuZeichnen } from '../router.js';
import * as speicher from '../speicher.js';
import { el, haenge, icon } from '../ui.js';

const KURZ = { J: 'Ja', R: 'Nur roh', K: 'Nur gekocht', N: 'Nein', S: 'Sonderfall' };
let filter = 'alle';

export async function zeigeMagListe(wurzel) {
  const [zutaten, vorlieben] = await Promise.all([speicher.alleZutaten(), speicher.alleVorlieben()]);
  const alle = zutaten.filter(istObstGemuese).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  document.title = `Mag-Liste – ${APP_NAME}`;

  const stand = el('p', { class: 'klein', id: 'mag-stand', 'aria-live': 'polite' });
  const zeigeStand = () => { stand.textContent = `${alle.filter((z) => vorlieben.has(z.id)).length} von ${alle.length} mit Angabe`; };

  const sichtbar = alle.filter((z) => {
    if (filter === 'offen') return !vorlieben.has(z.id);
    return filter === 'alle' || z.kategorie === filter;
  });

  const zeile = (zutat) => el('li', { class: 'magzeile' },
    el('label', { for: `mag-${zutat.id}` }, zutat.name, el('small', {}, kategorieName(zutat.kategorie))),
    el('select', {
      id: `mag-${zutat.id}`,
      // Nur der eine Wert ändert sich; die Liste bleibt stehen, damit man zügig durchgehen kann
      onchange: async (e) => {
        const mag = e.target.value;
        if (mag) vorlieben.set(zutat.id, { zutatId: zutat.id, mag, notiz: vorlieben.get(zutat.id)?.notiz ?? '' });
        else vorlieben.delete(zutat.id);
        await speicher.setzeVorliebe(zutat.id, mag, vorlieben.get(zutat.id)?.notiz);
        zeigeStand();
      },
    },
    el('option', { value: '' }, 'Keine Angabe'),
    MAG.map((m) => el('option', { value: m.id, selected: vorlieben.get(zutat.id)?.mag === m.id }, KURZ[m.id]))));

  const knopf = (id, text) => el('button', {
    type: 'button', class: 'wahl-knopf', 'aria-pressed': String(filter === id), onclick: () => { filter = id; neuZeichnen(); },
  }, text);

  zeigeStand();
  haenge(wurzel,
    el('a', { class: 'zurueck', href: '#/zutaten' }, icon('zurueck', 18), 'Zutaten'),
    el('header', { class: 'detailkopf' },
      el('h1', {}, 'Mag-Liste'),
      el('p', {}, 'Was isst du gern, und in welcher Form? In Suchlisten rutscht Abgelehntes ans Ende.'),
      stand),
    el('div', { class: 'wahl', role: 'group', 'aria-label': 'Auswahl' }, knopf('alle', 'Alle'), knopf('obst', 'Obst'), knopf('gemuese', 'Gemüse'), knopf('offen', 'Offen')),
    sichtbar.length
      ? el('ul', { class: 'zeilen' }, sichtbar.map(zeile))
      : el('p', { class: 'leer' }, 'Hier ist nichts mehr offen.'),
    el('p', { class: 'klein' }, 'Einen Sonderfall beschreibst du auf der Seite der Zutat, zum Beispiel „nur geschält“.'));
}
