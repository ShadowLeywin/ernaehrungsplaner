// Ansicht "Woche": Mahlzeiten für sieben Tage vormerken und ins Tagebuch übernehmen.

import { WOCHENTAGE, ausIso, formatTag, isoDatum, istGueltig, verschiebe } from '../logik/datum.js';
import { fuerMenge, summeEintraege } from '../logik/naehrwerte.js';
import { alsEintraege, naechsterFreierSlot } from '../logik/plan.js';
import { haltbarkeitsWarnungen } from '../logik/rezepte.js';
import { APP_NAME } from '../logik/schema.js';
import { wochenTage } from '../logik/woche.js';
import { SLOTS, TAGESTYPEN, tagestypFuer } from '../logik/ziele.js';
import { neuZeichnen } from '../router.js';
import * as speicher from '../speicher.js';
import { el, haenge, hinweis, icon, zahl } from '../ui.js';
import { zeigeEinkauf } from './einkauf.js';
import { oeffneEintrag, oeffneZutatWahl } from './eintrag.js';

const slotName = (id) => SLOTS.find((s) => s.id === id)?.name ?? '';
const slotRang = (id) => SLOTS.findIndex((s) => s.id === id);

/** "Diese Woche", "Nächste Woche", "Letzte Woche" oder "Woche ab 9. November" */
export function wochenTitel(montag, heute) {
  const dieser = wochenTage(heute)[0];
  if (montag === dieser) return 'Diese Woche';
  if (montag === verschiebe(dieser, 7)) return 'Nächste Woche';
  if (montag === verschiebe(dieser, -7)) return 'Letzte Woche';
  return `Woche ab ${formatTag(montag)}`;
}

export async function zeigeWoche(wurzel, teile) {
  const heute = isoDatum();
  const tage = wochenTage(istGueltig(teile[0]) ? teile[0] : heute);
  if (teile[1] === 'einkauf') return zeigeEinkauf(wurzel, tage, heute);

  // Die Vorwoche wird mitgelesen: Was am Sonntag gekocht wurde, kann am Dienstag schon zu alt sein
  const [mitVorwoche, ziele, wochenplan, tagSaetze, rezepte] = await Promise.all([
    speicher.planZwischen(verschiebe(tage[0], -7), tage[6]), speicher.ladeZiele(), speicher.ladeWoche(), Promise.all(tage.map(speicher.holeTag)), speicher.alleRezepte(),
  ]);
  const posten = mitVorwoche.filter((p) => p.datum >= tage[0]);
  const warnungen = haltbarkeitsWarnungen(mitVorwoche, new Map(rezepte.map((r) => [r.id, r])));
  document.title = `${wochenTitel(tage[0], heute)} – ${APP_NAME}`;

  haenge(wurzel,
    el('header', { class: 'tageskopf' },
      el('a', { class: 'rund', href: `#/woche/${verschiebe(tage[0], -7)}`, 'aria-label': 'Eine Woche zurück' }, icon('zurueck')),
      el('div', { class: 'tagestitel' },
        el('h1', {}, wochenTitel(tage[0], heute)),
        el('p', {}, `${formatTag(tage[0])} bis ${formatTag(tage[6])}`)),
      el('a', { class: 'rund', href: `#/woche/${verschiebe(tage[0], 7)}`, 'aria-label': 'Eine Woche weiter' }, icon('vor'))),
    el('div', { class: 'knopfreihe mitte' },
      el('a', { class: 'knopf', href: `#/woche/${tage[0]}/einkauf` }, 'Einkaufsliste')),
    posten.length === 0 ? el('p', { class: 'leer' }, 'Noch nichts geplant. Tippe an einem Tag auf das Plus und merke vor, was du essen willst.') : null,
    el('div', { class: 'slots' }, tage.map((datum, i) => tagBereich({
      datum,
      istHeute: datum === heute,
      posten: posten.filter((p) => p.datum === datum).sort((a, b) => slotRang(a.slot) - slotRang(b.slot) || String(a.erstellt).localeCompare(String(b.erstellt))),
      typ: tagestypFuer(datum, wochenplan, tagSaetze[i]),
      ziele,
      warnungen,
    }))));
}

function tagBereich({ datum, istHeute, posten, typ, ziele, warnungen }) {
  const geplant = summeEintraege(posten).kcal ?? 0;
  const offen = posten.filter((p) => !p.uebernommen);
  const typName = TAGESTYPEN.find((t) => t.id === typ).name;
  const wochentag = WOCHENTAGE[(ausIso(datum).getDay() + 6) % 7];

  const uebernehmen = async () => {
    for (const p of offen) {
      await speicher.speichereEintrag(alsEintraege([p])[0]);
      await speicher.speicherePlan({ ...p, uebernommen: true });
    }
    hinweis(`${offen.length} ${offen.length === 1 ? 'Mahlzeit' : 'Mahlzeiten'} ins Tagebuch übernommen.`);
    neuZeichnen();
  };

  return el('section', { class: istHeute ? 'slot plantag heute' : 'slot plantag', id: `tag-${datum}` },
    el('div', { class: 'slot-kopf' },
      el('div', {},
        el('h2', {}, `${wochentag}, ${formatTag(datum)}`, istHeute ? el('span', { class: 'marke' }, 'heute') : null),
        el('p', { class: 'slot-stand' }, `${typName}, ${zahl(geplant)} von ${zahl(ziele[typ].kcal)} kcal geplant`)),
      el('button', {
        type: 'button', class: 'rund plus', 'aria-label': `Für ${wochentag} einplanen`,
        onclick: () => oeffneZutatWahl({ datum, slot: naechsterFreierSlot(posten), beiFertig: neuZeichnen, ziel: 'plan' }),
      }, icon('plus'))),
    posten.length ? el('ul', { class: 'eintraege' }, posten.map((p) => el('li', {},
      el('button', { type: 'button', class: p.uebernommen ? 'eintrag erledigt' : 'eintrag', onclick: () => oeffneEintrag({ eintrag: p, beiFertig: neuZeichnen, ziel: 'plan' }) },
        el('span', { class: 'eintrag-name' }, p.name, el('small', {}, p.uebernommen ? `${slotName(p.slot)}, im Tagebuch` : slotName(p.slot))),
        el('span', { class: 'eintrag-menge' }, `${zahl(p.gramm, 1)} g`),
        el('span', { class: 'eintrag-kcal' }, `${zahl(fuerMenge(p.je100, p.gramm).kcal ?? 0)} kcal`))))) : null,
    posten.filter((p) => warnungen.has(p.id)).map((p) => {
      const warnung = warnungen.get(p.id);
      return el('p', { class: 'merkzettel haltbar' },
        `${p.name} wäre hier ${warnung.tage} Tage alt, hält aber nur ${warnung.haltbar}. ${warnung.einfrierbar ? 'Rechtzeitig einfrieren oder frisch kochen.' : 'Besser frisch kochen.'}`);
    }),
    offen.length ? el('button', { type: 'button', class: 'chip wie-vortag', onclick: uebernehmen }, 'Ins Tagebuch übernehmen') : null);
}
