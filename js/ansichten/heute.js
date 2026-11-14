// Ansicht "Heute": das Tagebuch eines Tages mit sechs Slots, Tagesscheibe und Makros.

import { formatLang, isoDatum, istGueltig, relativ, verschiebe } from '../logik/datum.js';
import { MAKROS, NAEHRSTOFFE, fuerMenge, summeEintraege } from '../logik/naehrwerte.js';
import { fuellRadius, segmente, sektorPfad } from '../logik/scheibe.js';
import { APP_NAME } from '../logik/schema.js';
import { SLOTS, TAGESTYPEN, fortschritt, tagestypFuer } from '../logik/ziele.js';
import { neuZeichnen } from '../router.js';
import * as speicher from '../speicher.js';
import { el, gramm, haenge, icon, svg, zahl } from '../ui.js';
import { oeffneEintrag, oeffneZutatWahl } from './eintrag.js';

const nameVon = (id) => NAEHRSTOFFE.find((n) => n.id === id).name;

export async function zeigeHeute(wurzel, [parameter]) {
  const heute = isoDatum();
  const datum = istGueltig(parameter) ? parameter : heute;
  const [eintraege, ziele, woche, tag] = await Promise.all([
    speicher.eintraegeAm(datum), speicher.ladeZiele(), speicher.ladeWoche(), speicher.holeTag(datum),
  ]);
  const lautPlan = tagestypFuer(datum, woche, null);
  const typ = tagestypFuer(datum, woche, tag);
  const ziel = ziele[typ];
  const ist = summeEintraege(eintraege);
  const jeSlot = Object.fromEntries(SLOTS.map((s) => [s.id, eintraege
    .filter((e) => e.slot === s.id)
    .sort((a, b) => String(a.erstellt).localeCompare(String(b.erstellt)))]));
  const kcalJeSlot = Object.fromEntries(SLOTS.map((s) => [s.id, summeEintraege(jeSlot[s.id]).kcal ?? 0]));

  document.title = `${relativ(datum, heute) ?? formatLang(datum)} – ${APP_NAME}`;
  haenge(wurzel, 
    kopf(datum, heute),
    tagestypWahl(datum, typ, lautPlan),
    uebersicht(ist, ziel, kcalJeSlot),
    eintraege.length === 0 ? el('p', { class: 'leer' }, 'Noch nichts eingetragen. Tippe bei einer Mahlzeit auf das Plus.') : null,
    el('div', { class: 'slots' }, SLOTS.map((slot) => slotBereich(slot, jeSlot[slot.id], kcalJeSlot[slot.id], ziel.kcal * slot.anteil, datum))),
  );
}

function kopf(datum, heute) {
  const nah = relativ(datum, heute);
  return el('header', { class: 'tageskopf' },
    el('a', { class: 'rund', href: `#/heute/${verschiebe(datum, -1)}`, 'aria-label': 'Einen Tag zurück' }, icon('zurueck')),
    el('div', { class: 'tagestitel' },
      el('h1', {}, nah ?? formatLang(datum)),
      nah ? el('p', {}, formatLang(datum)) : null,
      datum !== heute ? el('a', { class: 'textlink', href: '#/heute' }, 'Zu heute') : null),
    el('a', { class: 'rund', href: `#/heute/${verschiebe(datum, 1)}`, 'aria-label': 'Einen Tag weiter' }, icon('vor')));
}

function tagestypWahl(datum, typ, lautPlan) {
  const waehle = async (id) => {
    await speicher.setzeTagestyp(datum, id === lautPlan ? null : id);
    neuZeichnen();
  };
  return el('div', { class: 'wahl', role: 'group', 'aria-label': 'Tagestyp' },
    TAGESTYPEN.map((t) => el('button', {
      type: 'button', class: 'wahl-knopf', 'aria-pressed': String(t.id === typ), onclick: () => waehle(t.id),
    }, t.name)));
}

/* ---------- Übersicht: Tagesscheibe und Makros ---------- */

function uebersicht(ist, ziel, kcalJeSlot) {
  const kcal = fortschritt(ist.kcal ?? 0, ziel.kcal);
  return el('section', { class: 'uebersicht', 'aria-label': 'Tagesstand' },
    el('div', { class: 'scheibe-rahmen' },
      tagesscheibe(kcalJeSlot, ziel.kcal),
      el('div', { class: kcal.ueber ? 'scheibe-mitte ueber' : 'scheibe-mitte' },
        el('strong', {}, zahl(Math.abs(kcal.rest))),
        el('span', {}, kcal.ueber ? 'kcal drüber' : 'kcal übrig'))),
    el('p', { class: 'kcal-zeile' }, `${zahl(ist.kcal ?? 0)} von ${zahl(ziel.kcal)} kcal gegessen`),
    el('ul', { class: 'makros' }, MAKROS.map((id) => makroZeile(id, ist[id] ?? 0, ziel[id]))));
}

function tagesscheibe(kcalJeSlot, zielKcal) {
  const M = 100; // Mittelpunkt
  const R_INNEN = 50;
  const R_AUSSEN = 96;
  const teile = segmente(SLOTS, kcalJeSlot, zielKcal).map((s) => {
    const slot = SLOTS.find((x) => x.id === s.id);
    const voll = Math.min(1, s.anteil);
    return svg('a', { href: `#slot-${s.id}`, class: s.ueber ? 'segment ueber' : 'segment', onclick: (e) => springeZu(e, s.id) },
      svg('title', {}, `${slot.name}: ${zahl(s.ist)} von ${zahl(s.ziel)} kcal`),
      svg('path', { class: 'segment-grund', d: sektorPfad(M, M, R_INNEN, R_AUSSEN, s.start, s.ende) }),
      voll > 0.01 ? svg('path', { class: 'segment-voll', d: sektorPfad(M, M, R_INNEN, fuellRadius(R_INNEN, R_AUSSEN, voll), s.start, s.ende) }) : null);
  });
  return svg('svg', { class: 'scheibe', viewBox: '0 0 200 200', role: 'img', 'aria-label': 'Energie je Mahlzeit' }, teile);
}

/** Zum Slot rollen, ohne die Adresse zu ändern (die gehört dem Router). */
function springeZu(ereignis, slotId) {
  ereignis.preventDefault();
  const sanft = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById(`slot-${slotId}`)?.scrollIntoView({ behavior: sanft ? 'smooth' : 'auto', block: 'start' });
}

function makroZeile(id, ist, ziel) {
  const stand = fortschritt(ist, ziel);
  return el('li', { class: `makro makro-${id}${stand.ueber ? ' ueber' : ''}` },
    el('span', { class: 'makro-name' }, nameVon(id)),
    el('span', { class: 'makro-wert' }, `${gramm(ist)} von ${zahl(ziel)} g`),
    el('span', { class: 'balken', role: 'progressbar', 'aria-label': nameVon(id), 'aria-valuemin': 0, 'aria-valuemax': Math.round(ziel), 'aria-valuenow': Math.round(ist) },
      el('span', { class: 'balken-voll', style: `width:${Math.min(100, stand.anteil * 100).toFixed(1)}%` })));
}

/* ---------- Slots ---------- */

function slotBereich(slot, eintraege, kcal, zielKcal, datum) {
  return el('section', { class: 'slot', id: `slot-${slot.id}` },
    el('div', { class: 'slot-kopf' },
      el('div', {},
        el('h2', {}, slot.name),
        el('p', { class: 'slot-stand' }, `${zahl(kcal)} von ${zahl(zielKcal)} kcal${slot.hinweis ? `, ${slot.hinweis}` : ''}`)),
      el('button', {
        type: 'button', class: 'rund plus', 'aria-label': `Zu ${slot.name} hinzufügen`,
        onclick: () => oeffneZutatWahl({ datum, slot: slot.id, beiFertig: neuZeichnen }),
      }, icon('plus'))),
    eintraege.length ? el('ul', { class: 'eintraege' }, eintraege.map((e) => el('li', {},
      el('button', { type: 'button', class: 'eintrag', onclick: () => oeffneEintrag({ eintrag: e, beiFertig: neuZeichnen }) },
        el('span', { class: 'eintrag-name' }, e.name, e.marke ? el('small', {}, e.marke) : null),
        el('span', { class: 'eintrag-menge' }, `${zahl(e.gramm, 1)} g`),
        el('span', { class: 'eintrag-kcal' }, `${zahl(fuerMenge(e.je100, e.gramm).kcal ?? 0)} kcal`))))) : null);
}
