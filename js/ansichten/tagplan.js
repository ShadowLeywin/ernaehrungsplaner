// Tagesplan: ein Tag mit seinen sechs Mahlzeiten, wie „Heute“, nur vorgemerkt statt gegessen.
// Jede Mahlzeit hat ihr eigenes Plus; so landet das Abendessen im Abendessen, ohne Umweg über ein Auswahlfeld.

import { formatLang, formatTag, isoDatum, istGueltig, relativ, verschiebe } from '../logik/datum.js';
import { fuerMenge, summeEintraege } from '../logik/naehrwerte.js';
import { alsEintraege, planJeSlot } from '../logik/plan.js';
import { APP_NAME } from '../logik/schema.js';
import { TAGESTYPEN, tagestypFuer } from '../logik/ziele.js';
import { neuZeichnen } from '../router.js';
import * as speicher from '../speicher.js';
import { el, haenge, hinweis, icon, zahl } from '../ui.js';
import { oeffneEintrag, oeffneZutatWahl } from './eintrag.js';
import { SLOT_EMOJI } from './heute.js';

export async function zeigeTagPlan(wurzel, datumTeil) {
  const heute = isoDatum();
  const datum = istGueltig(datumTeil) ? datumTeil : heute;
  const [posten, ziele, wochenplan, tagSatz, slots] = await Promise.all([
    speicher.planAm(datum), speicher.ladeZiele(), speicher.ladeWoche(), speicher.holeTag(datum), speicher.ladeSlots(),
  ]);
  const typ = tagestypFuer(datum, wochenplan, tagSatz);
  const zielKcal = ziele[typ].kcal;
  const jeSlot = planJeSlot(posten, slots, zielKcal);
  const geplant = summeEintraege(posten).kcal ?? 0;
  const offen = posten.filter((p) => !p.uebernommen);
  const name = relativ(datum, heute) ?? formatLang(datum).split(',')[0];
  document.title = `Plan ${name} – ${APP_NAME}`;

  const uebernehmen = async () => {
    for (const p of offen) {
      await speicher.speichereEintrag(alsEintraege([p])[0]);
      await speicher.speicherePlan({ ...p, uebernommen: true });
    }
    hinweis(`${offen.length} ${offen.length === 1 ? 'Mahlzeit' : 'Mahlzeiten'} ins Tagebuch übernommen.`);
    neuZeichnen();
  };

  haenge(wurzel,
    el('a', { class: 'zurueck', href: `#/woche/${datum}` }, icon('zurueck', 18), 'Woche'),
    el('header', { class: 'tageskopf' },
      el('div', { class: 'tagestitel' },
        el('p', { class: 'ueberzeile' }, `${formatTag(datum)} · ${TAGESTYPEN.find((t) => t.id === typ).name}`),
        el('h1', {}, `Plan ${name}`)),
      el('div', { class: 'blaettern' },
        el('a', { class: 'rund', href: `#/woche/tag/${verschiebe(datum, -1)}`, 'aria-label': 'Ein Tag zurück' }, icon('zurueck')),
        el('a', { class: 'rund', href: `#/woche/tag/${verschiebe(datum, 1)}`, 'aria-label': 'Ein Tag weiter' }, icon('vor')))),
    el('p', { class: 'kcal-zeile', id: 'tagplan-summe' }, `${zahl(geplant)} von ${zahl(zielKcal)} kcal geplant`),
    el('section', { class: 'karte', 'aria-label': 'Mahlzeiten' }, el('div', { class: 'slots' }, jeSlot.map(({ slot, posten: liste, kcal, ziel }) => el('section', { class: 'slot', id: `planslot-${slot.id}` },
      el('div', { class: 'slot-kopf' },
        el('span', { class: 'slot-bild', 'aria-hidden': 'true' }, SLOT_EMOJI[slot.id] ?? '🍽️'),
        el('div', { class: 'slot-text' },
          el('h2', {}, slot.name),
          el('p', { class: 'slot-stand' }, `${zahl(kcal)} von ${zahl(ziel)} kcal`)),
        el('button', {
          type: 'button', class: 'rund plus', 'aria-label': `In ${slot.name} einplanen`,
          onclick: () => oeffneZutatWahl({ datum, slot: slot.id, beiFertig: neuZeichnen, ziel: 'plan' }),
        }, icon('plus'))),
      liste.length ? el('ul', { class: 'eintraege' }, liste.map((p) => el('li', {},
        el('button', { type: 'button', class: p.uebernommen ? 'eintrag erledigt' : 'eintrag', onclick: () => oeffneEintrag({ eintrag: p, beiFertig: neuZeichnen, ziel: 'plan' }) },
          el('span', { class: 'eintrag-name' }, p.name, p.uebernommen ? el('small', {}, 'im Tagebuch') : (p.rezeptId ? el('small', {}, 'Rezept') : null)),
          el('span', { class: 'eintrag-menge' }, `${zahl(p.gramm, 1)} g`),
          el('span', { class: 'eintrag-kcal' }, `${zahl(fuerMenge(p.je100, p.gramm).kcal ?? 0)} kcal`))))) : null)))),
    offen.length ? el('div', { class: 'knopfreihe' }, el('button', { type: 'button', class: 'knopf', onclick: uebernehmen }, 'Ins Tagebuch übernehmen')) : null);
}
