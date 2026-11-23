// Monatsansicht des Plans: jede Woche als eigene Karte mit sieben Tagen, damit ein Monatsplan
// in Wochen zerfällt, wie man ihn einkauft und vorkocht. Getippt wird in die Woche oder den Tag.

import { WOCHENTAGE, ausIso, formatZeitraum, isoDatum } from '../logik/datum.js';
import { summeEintraege } from '../logik/naehrwerte.js';
import { APP_NAME } from '../logik/schema.js';
import { istMonat, monatVon, monatsName, monatsWochen, verschiebeMonat } from '../logik/zeitraum.js';
import { SLOTS, tagestypFuer } from '../logik/ziele.js';
import { gehe } from '../router.js';
import * as speicher from '../speicher.js';
import { el, haenge, icon, zahl } from '../ui.js';

/** Gemerkte Ansicht des Plans: 'woche' oder 'monat'. Die Leiste öffnet, was zuletzt gewählt war. */
export const PLAN_ANSICHTEN = ['woche', 'monat'];
export async function ladePlanAnsicht() {
  const wert = await speicher.einstellung('planAnsicht');
  return PLAN_ANSICHTEN.includes(wert) ? wert : 'woche';
}

/** Umschalter „Woche | Monat“ oben im Plan. datum bestimmt, welche Woche oder welcher Monat sich öffnet. */
export function ansichtWahl(aktiv, datum) {
  const waehle = async (ansicht) => {
    await speicher.setzeEinstellung('planAnsicht', ansicht);
    gehe(ansicht === 'monat' ? `/woche/monat/${monatVon(datum)}` : `/woche/${datum}`);
  };
  return el('div', { class: 'wahl schmal-voll planansicht', role: 'group', 'aria-label': 'Planzeitraum' },
    [['woche', 'Woche'], ['monat', 'Monat']].map(([id, name]) => el('button', {
      type: 'button', class: 'wahl-knopf', 'aria-pressed': String(id === aktiv), onclick: () => waehle(id),
    }, name)));
}

export async function zeigeMonat(wurzel, monatTeil) {
  const heute = isoDatum();
  const monat = istMonat(monatTeil) ? monatTeil : monatVon(heute);
  const wochen = monatsWochen(monat);
  const alleTage = wochen.flatMap((w) => w.tage.map((t) => t.datum));
  const [posten, ziele, wochenplan, tagSaetze] = await Promise.all([
    speicher.planZwischen(alleTage[0], alleTage.at(-1)), speicher.ladeZiele(), speicher.ladeWoche(), Promise.all(alleTage.map(speicher.holeTag)),
  ]);
  const tagSatz = new Map(alleTage.map((d, i) => [d, tagSaetze[i]]));
  const jeTag = new Map();
  for (const p of posten) jeTag.set(p.datum, [...(jeTag.get(p.datum) ?? []), p]);
  const ersterTag = `${monat}-01`;
  const letzterTag = wochen.at(-1).tage.filter((t) => t.imMonat).at(-1).datum;
  document.title = `${monatsName(monat)} – ${APP_NAME}`;

  const geplanteTage = [...jeTag.keys()].filter((d) => d.startsWith(monat)).length;

  haenge(wurzel,
    el('header', { class: 'tageskopf' },
      el('div', { class: 'tagestitel' },
        el('p', { class: 'ueberzeile' }, geplanteTage ? `${geplanteTage} ${geplanteTage === 1 ? 'Tag' : 'Tage'} geplant` : 'Plan'),
        el('h1', {}, monatsName(monat))),
      el('div', { class: 'blaettern' },
        el('a', { class: 'rund', href: `#/woche/monat/${verschiebeMonat(monat, -1)}`, 'aria-label': 'Ein Monat zurück' }, icon('zurueck')),
        el('a', { class: 'rund', href: `#/woche/monat/${verschiebeMonat(monat, 1)}`, 'aria-label': 'Ein Monat weiter' }, icon('vor')))),
    ansichtWahl('monat', monat === monatVon(heute) ? heute : ersterTag),
    el('div', { class: 'knopfreihe mitte' },
      el('a', { class: 'knopf leise', href: '#/angebote' }, 'Angebote'),
      el('a', { class: 'knopf', href: `#/einkauf/${ersterTag}/${letzterTag}` }, 'Einkaufsliste Monat')),
    geplanteTage === 0 ? el('p', { class: 'leer' }, 'In diesem Monat ist noch nichts geplant. Tippe auf einen Tag und plane seine Mahlzeiten.') : null,
    wochen.map((w) => wochenKarte(w, { heute, jeTag, tagSatz, wochenplan, ziele })));
}

function wochenKarte(woche, { heute, jeTag, tagSatz, wochenplan, ziele }) {
  const posten = woche.tage.flatMap((t) => jeTag.get(t.datum) ?? []);
  const kcal = summeEintraege(posten).kcal ?? 0;
  const tageMitPlan = woche.tage.filter((t) => jeTag.has(t.datum)).length;
  return el('section', { class: woche.tage.some((t) => t.datum === heute) ? 'karte monatswoche diese' : 'karte monatswoche', 'aria-label': `Kalenderwoche ${woche.kw}` },
    el('div', { class: 'monatswoche-kopf' },
      el('a', { class: 'monatswoche-titel', href: `#/woche/${woche.von}` },
        el('strong', {}, `KW ${woche.kw}`),
        el('span', {}, formatZeitraum(woche.von, woche.bis))),
      el('span', { class: 'klein' }, tageMitPlan ? `${tageMitPlan}/7 · ${zahl(kcal)} kcal` : 'leer')),
    el('ol', { class: 'monatstage' }, woche.tage.map(({ datum, imMonat }) => {
      const tag = jeTag.get(datum) ?? [];
      const belegt = new Set(tag.map((p) => p.slot));
      const typ = tagestypFuer(datum, wochenplan, tagSatz.get(datum));
      const tagKcal = summeEintraege(tag).kcal ?? 0;
      const name = WOCHENTAGE[(ausIso(datum).getDay() + 6) % 7];
      const klassen = ['monatstag', `tagestyp-${typ}`, imMonat ? '' : 'fremd', datum === heute ? 'heute' : '', tag.length ? 'geplant' : ''].filter(Boolean).join(' ');
      return el('li', {}, el('a', {
        class: klassen, href: `#/woche/${datum}`,
        'aria-label': `${name}, ${ausIso(datum).getDate()}.: ${tag.length ? `${belegt.size} von 6 Mahlzeiten geplant, ${zahl(tagKcal)} von ${zahl(ziele[typ].kcal)} kcal` : 'nichts geplant'}`,
      },
      el('small', { 'aria-hidden': 'true' }, name.slice(0, 2)),
      el('strong', { 'aria-hidden': 'true' }, String(ausIso(datum).getDate())),
      // Ein Punkt je Mahlzeit: voll = geplant. So sieht man Lücken im Plan, ohne den Tag zu öffnen
      el('span', { class: 'slotpunkte', 'aria-hidden': 'true' }, SLOTS.map((s) => el('i', { class: belegt.has(s.id) ? 'voll' : '' })))));
    })),
    // Nur Wochen mit Plan haben etwas einzukaufen; sechs gleiche Knöpfe in leeren Wochen wären Lärm
    tageMitPlan ? el('div', { class: 'monatswoche-fuss' },
      el('a', { class: 'chip', href: `#/einkauf/${woche.von}/${woche.bis}` }, 'Einkauf dieser Woche')) : null);
}
