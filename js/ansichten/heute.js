// Ansicht "Heute": das Tagebuch eines Tages mit sechs Slots, Tagesscheibe, Makros und allen Nährwerten.

import { backupFaellig } from '../logik/backup.js';
import { formatKurz, formatLang, isoDatum, istGueltig, relativ, verschiebe } from '../logik/datum.js';
import { MAKROS, NAEHRSTOFFE, fuerMenge, luecken, summeEintraege } from '../logik/naehrwerte.js';
import { fuellRadius, segmente, sektorPfad } from '../logik/scheibe.js';
import { APP_NAME } from '../logik/schema.js';
import { alsEintraege } from '../logik/plan.js';
import { prozent } from '../logik/referenz.js';
import { kopiereEintraege, wochenSchnitt, wochenTage } from '../logik/woche.js';
import { bereinigeWasserMengen } from '../logik/gesundheit.js';
import { FEIER_RINGE, TAGESTYPEN, bereinigeRinge, fortschritt, kachelSpalten, neuErreicht, slotFuerUhrzeit, tagestypFuer } from '../logik/ziele.js';
import { aktualisiereWidget, tippGefuehl } from '../plattform.js';
import { gehe, neuZeichnen } from '../router.js';
import * as speicher from '../speicher.js';
import { blatt, el, gramm, haenge, hinweis, icon, svg, zahl } from '../ui.js';
import { merkeAlsVorlage, oeffneEintrag, oeffneZutatWahl } from './eintrag.js';
import { checkinKarte, supplementKarte, tageswerteKarte } from './health.js';

const nameVon = (id) => NAEHRSTOFFE.find((n) => n.id === id).name;
const eintraegeText = (n) => `${n} ${n === 1 ? 'Eintrag' : 'Einträge'}`;

// Bleibt beim Neuzeichnen erhalten: ist "Alle Nährwerte" aufgeklappt, und zeigt es den Tag oder die Woche?
const ansicht = { offen: false, modus: 'tag' };

export async function zeigeHeute(wurzel, [parameter]) {
  const heute = isoDatum();
  const datum = istGueltig(parameter) ? parameter : heute;
  const woche = wochenTage(datum);
  const [eintraege, ziele, wochenplan, tag, slots, wochenEintraege, vortag, plan, letztesBackup, anzahlEintraege, referenz, wasserHeute, gesundheit, ringe, supplements, wasserMengen] = await Promise.all([
    speicher.eintraegeAm(datum), speicher.ladeZiele(), speicher.ladeWoche(), speicher.holeTag(datum), speicher.ladeSlots(),
    speicher.eintraegeZwischen(woche[0], woche[6]), speicher.eintraegeAm(verschiebe(datum, -1)), speicher.planAm(datum),
    speicher.einstellung('letztesBackup'), speicher.anzahlEintraege(), speicher.ladeReferenz(),
    speicher.messungenZwischen(datum, datum), speicher.ladeGesundheit(), speicher.einstellung('ringe').then(bereinigeRinge),
    speicher.alleSupplements(), speicher.einstellung('wasserMengen').then(bereinigeWasserMengen),
  ]);
  const lautPlan = tagestypFuer(datum, wochenplan, null);
  const typ = tagestypFuer(datum, wochenplan, tag);
  const ziel = ziele[typ];
  const ist = summeEintraege(eintraege);
  const imSlot = (liste, slot) => liste.filter((e) => e.slot === slot.id).sort((a, b) => String(a.erstellt).localeCompare(String(b.erstellt)));
  const kcalJeSlot = Object.fromEntries(slots.map((s) => [s.id, summeEintraege(imSlot(eintraege, s)).kcal ?? 0]));

  document.title = `${relativ(datum, heute) ?? formatLang(datum)} – ${APP_NAME}`;
  // Widget zeigt immer den heutigen Tag, auch wenn man gerade einen anderen ansieht
  const widget = datum === heute ? (wasserMl) => aktualisiereWidget({
    datum, kcalUebrig: ziel.kcal - (ist.kcal ?? 0), wasserMl, wasserZielMl: gesundheit.wasserZielMl,
  }) : () => {};
  haenge(wurzel,
    kopf(datum, heute),
    tagestypWahl(datum, typ, lautPlan, tag),
    geplantHinweis(plan.filter((p) => !p.uebernommen), datum),
    uebersicht(ist, ziel, slots, kcalJeSlot),
    kacheln({ ist, ziel, datum, ringe, widget, wasser: wasserHeute.filter((m) => m.art === 'wasser'), wasserZielMl: gesundheit.wasserZielMl, wasserMl: wasserMengen[0] }),
    el('section', { class: 'karte mahlzeiten', 'aria-label': 'Mahlzeiten' },
      el('h2', { class: 'kartentitel' }, 'Mahlzeiten'),
      // Leer-Hinweis in der Karte, wo man gleich tippt, statt als loser Satz dazwischen
      eintraege.length === 0 && !plan.some((p) => !p.uebernommen) ? el('p', { class: 'leer' }, 'Noch nichts eingetragen. Tippe bei einer Mahlzeit auf das Plus.') : null,
      el('div', { class: 'slots' }, slots.map((slot) => slotBereich({
        slot, datum, eintraege: imSlot(eintraege, slot), vortag: imSlot(vortag, slot), kcal: kcalJeSlot[slot.id], zielKcal: ziel.kcal * slot.anteil,
      })))),
    // Alles, was man am Tag einträgt, an einem Ort: erst Essen, dann Körperwerte und Supplements
    tageswerteKarte({ datum, messungen: wasserHeute, ziele: gesundheit, mengen: wasserMengen }),
    supplementKarte(datum, supplements, tag),
    checkinKarte(datum, wasserHeute),
    alleNaehrwerte(eintraege, wochenEintraege, woche, referenz),
    eintraege.length ? el('div', { class: 'knopfreihe' },
      el('button', { type: 'button', class: 'knopf leise', onclick: () => oeffneTagKopieren(datum, heute, eintraege) }, 'Diesen Tag kopieren')) : null,
    backupErinnerung(backupFaellig(letztesBackup, heute, anzahlEintraege)),
    // Schnell eintragen: der Slot passt zur Uhrzeit und lässt sich im Blatt noch ändern
    beobachteFab(),
    el('button', {
      type: 'button', class: 'fab', 'aria-label': 'Essen erfassen',
      onclick: () => oeffneZutatWahl({ datum, slot: slotFuerUhrzeit(new Date().getHours()), beiFertig: neuZeichnen }),
    }, icon('plus', 28)),
  );
}

/**
 * Der Plus-Knopf weicht beim Herunterrollen aus und kommt beim Hochrollen oder am Seitenende zurück.
 * So verdeckt er beim Lesen nicht die Plus-Knöpfe der Mahlzeiten. Ein einziger Zuhörer für alle Seiten.
 */
let fabBeobachtet = false;
function beobachteFab() {
  if (fabBeobachtet) return null;
  fabBeobachtet = true;
  // Richtung mit Puffer: verschwindet nach 12 px nach unten, kommt erst nach 48 px nach oben zurück.
  // So lassen kleine Gegenbewegungen (Finger zittert, Wischen federt aus) den Knopf in Ruhe.
  // Oben und am Ende ist er immer da; am Ende hält der Abstand unter der Seite ihm Platz frei.
  let zuletzt = window.scrollY;
  let strecke = 0;
  let geplant = false;
  const pruefe = () => {
    geplant = false;
    const fab = document.querySelector('.fab');
    const y = Math.max(0, window.scrollY);
    const schritt = y - zuletzt;
    zuletzt = y;
    if (!fab || schritt === 0) return;
    strecke = Math.sign(schritt) === Math.sign(strecke) ? strecke + schritt : schritt;
    const amEnde = y + window.innerHeight >= document.documentElement.scrollHeight - 24;
    if (y < 120 || amEnde) fab.classList.remove('weg');
    else if (strecke > 12) fab.classList.add('weg');
    else if (strecke < -48) fab.classList.remove('weg');
  };
  // Einmal je Bild statt bei jedem Scroll-Ereignis
  window.addEventListener('scroll', () => { if (!geplant) { geplant = true; requestAnimationFrame(pruefe); } }, { passive: true });
  return null;
}

function kopf(datum, heute) {
  const nah = relativ(datum, heute);
  // Großer Titel links, Datum klein darüber, Blättern rechts: so lesen sich Tagesansichten auf iOS
  return el('header', { class: 'tageskopf' },
    el('div', { class: 'tagestitel' },
      nah ? el('p', { class: 'ueberzeile' }, formatLang(datum)) : null,
      el('h1', {}, nah ?? formatLang(datum)),
      datum !== heute ? el('a', { class: 'textlink', href: '#/heute' }, 'Zu heute') : null),
    el('div', { class: 'blaettern' },
      el('a', { class: 'rund', href: `#/heute/${verschiebe(datum, -1)}`, 'aria-label': 'Einen Tag zurück' }, icon('zurueck')),
      el('a', { class: 'rund', href: `#/heute/${verschiebe(datum, 1)}`, 'aria-label': 'Einen Tag weiter' }, icon('vor'))));
}

function tagestypWahl(datum, typ, lautPlan, tag) {
  const waehle = async (id) => {
    await speicher.setzeTagestyp(datum, id === lautPlan ? null : id);
    neuZeichnen();
  };
  const wahl = el('div', { class: 'wahl', role: 'group', 'aria-label': 'Tagestyp' },
    TAGESTYPEN.map((t) => el('button', {
      type: 'button', class: 'wahl-knopf', 'aria-pressed': String(t.id === typ), onclick: () => waehle(t.id),
    }, t.name)));
  // Woher der Typ kommt, wenn nicht von dir: ein Training in Health Connect
  return tag?.tagestypQuelle === 'healthconnect'
    ? [wahl, el('p', { class: 'klein tagestyp-quelle' }, 'Aus deinem Training in Health Connect. Antippen ändert es.')]
    : wahl;
}

/** Steht für diesen Tag etwas im Wochenplan, das noch nicht im Tagebuch ist? Dann ein Tipp zum Übernehmen. */
function geplantHinweis(offen, datum) {
  if (!offen.length) return null;
  const uebernehmen = async () => {
    for (const p of offen) {
      await speicher.speichereEintrag(alsEintraege([p])[0]);
      await speicher.speicherePlan({ ...p, uebernommen: true });
    }
    hinweis('Aus dem Wochenplan übernommen.');
    neuZeichnen();
  };
  return el('div', { class: 'merkzettel geplant' },
    el('p', {}, `Im Wochenplan ${offen.length === 1 ? 'steht 1 Mahlzeit' : `stehen ${offen.length} Mahlzeiten`} mit ${zahl(summeEintraege(offen).kcal ?? 0)} kcal.`),
    el('div', { class: 'knopfreihe' },
      el('a', { class: 'knopf leise klein', href: `#/woche/${datum}` }, 'Plan ansehen'),
      el('button', { type: 'button', class: 'knopf klein', onclick: uebernehmen }, 'Übernehmen')));
}

/** Browser-Speicher kann verloren gehen; die Erinnerung steht unten, damit sie beim Eintragen nicht stört. */
function backupErinnerung({ faellig, tage }) {
  if (!faellig) return null;
  return el('div', { class: 'merkzettel backup-erinnerung' },
    el('p', {}, tage === null
      ? 'Du hast noch kein Backup. Deine Einträge liegen nur in diesem Browser.'
      : `Dein letztes Backup ist ${tage} Tage her.`),
    el('a', { class: 'textlink', href: '#/mehr/backup' }, 'Zum Backup'));
}

/* ---------- Übersicht: Kalorien-Karte mit Tagesscheibe ---------- */

function uebersicht(ist, ziel, slots, kcalJeSlot) {
  const kcal = fortschritt(ist.kcal ?? 0, ziel.kcal);
  return el('section', { class: 'uebersicht', 'aria-label': 'Tagesstand' },
    el('div', { class: kcal.ueber ? 'kcal-gross ueber' : 'kcal-gross' },
      el('span', { class: 'kartentitel' }, 'Energie'),
      el('strong', {}, zahl(Math.abs(kcal.rest))),
      el('span', { class: 'kcal-rest' }, kcal.ueber ? 'kcal drüber' : 'kcal übrig'),
      el('p', { class: 'kcal-zeile' }, `${zahl(ist.kcal ?? 0)} von ${zahl(ziel.kcal)} kcal gegessen`)),
    el('div', { class: 'scheibe-rahmen' },
      tagesscheibe(slots, kcalJeSlot, ziel.kcal),
      el('div', { class: 'scheibe-mitte' }, el('span', {}, `${zahl(Math.round(kcal.anteil * 100))} %`))));
}

function tagesscheibe(slots, kcalJeSlot, zielKcal) {
  const M = 100; // Mittelpunkt
  const R_INNEN = 50;
  const R_AUSSEN = 96;
  const teile = segmente(slots, kcalJeSlot, zielKcal).filter((s) => s.sichtbar).map((s) => {
    const slot = slots.find((x) => x.id === s.id);
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

/* ---------- Kacheln: ein Ring je Makro, dazu Wasser und alle Nährwerte ---------- */

// Weiche Trennstellen, damit lange Wörter in schmalen Kacheln an der richtigen Stelle umbrechen
const KACHEL_NAME = { kh: 'Kohlen\u00ADhydrate', ballaststoffe: 'Ballast\u00ADstoffe' };
const EMOJI = { protein: '🥚', kh: '🍞', fett: '🥑', ballaststoffe: '🥦', wasser: '💧', alle: '📊' };

// Letzter angezeigter Stand je Tag und Ring. Daraus: Ringe gleiten vom alten Wert aus, und eine Feier
// gibt es nur, wenn ein Ring gerade voll wird, nicht schon beim Öffnen der Seite.
const letzterStand = new Map();

const prozentVon = (anteil) => Math.max(0, Math.min(1, anteil)) * 100;
const runde2Von = (anteil) => Math.max(0, Math.min(1, anteil - 1)) * 100;

/**
 * Ring wie bei Aktivitäts-Apps: pathLength=100, damit der Strich direkt in Prozent angegeben wird.
 * Über 100 % läuft eine zweite, dunklere Runde weiter (höchstens bis 200 %).
 * vorher: der zuletzt gezeigte Anteil, von dem aus die Füll-Animation startet.
 */
function ring(anteil, emoji, vorher = 0) {
  const kreis = (klasse) => svg('circle', { class: klasse, cx: 32, cy: 32, r: 27, pathLength: 100 });
  const span = el('span', { class: 'ring', style: `--von-voll:${prozentVon(vorher).toFixed(1)};--von-runde2:${runde2Von(vorher).toFixed(1)}` },
    svg('svg', { viewBox: '0 0 64 64', 'aria-hidden': 'true' }, kreis('ring-grund'), kreis('ring-voll'), kreis('ring-runde2')),
    el('span', { class: 'ring-bild', 'aria-hidden': 'true' }, emoji));
  setzeRing(span, anteil);
  return span;
}

/** Ring auf einen neuen Anteil setzen, ohne ihn neu zu bauen: Die Änderung gleitet über die CSS-Transition. */
function setzeRing(span, anteil) {
  for (const [klasse, wert] of [['ring-voll', prozentVon(anteil)], ['ring-runde2', runde2Von(anteil)]]) {
    const kreis = span.querySelector(`.${klasse}`);
    kreis.setAttribute('stroke-dasharray', `${wert.toFixed(1)} 100`);
    kreis.classList.toggle('leer', wert < 0.5); // sonst zeichnet das runde Linienende einen Punkt
  }
}

/** Stand merken; meldet true, wenn ein feierwürdiger Ring gerade voll geworden ist. */
function merkeStand(datum, id, anteil) {
  const schluessel = `${datum}:${id}`;
  const vorher = letzterStand.get(schluessel);
  letzterStand.set(schluessel, anteil);
  return { vorher: vorher ?? 0, feiern: FEIER_RINGE.includes(id) && neuErreicht(vorher, anteil) };
}

/** Kurz aufleuchten und vibrieren. Ein Hinweis wäre schöner, würde aber „Rückgängig“ vom Eintragen verdrängen. */
function feiere(kachel) {
  kachel.classList.remove('gefeiert');
  void kachel.offsetWidth; // Animation neu starten, falls sie gerade lief
  kachel.classList.add('gefeiert');
  tippGefuehl('feier');
}

function kacheln({ ist, ziel, datum, ringe, widget, wasser, wasserZielMl, wasserMl }) {
  widget(wasser.reduce((s, m) => s + m.wert, 0));
  if (!ringe.length) return null;
  const bauen = {
    wasser: () => wasserKachel(datum, wasser, wasserZielMl, widget, wasserMl),
    alle: () => el('button', { type: 'button', class: 'kachel kachel-alle', onclick: zeigeAlleNaehrwerte },
      ring(0, EMOJI.alle),
      el('strong', { class: 'kachel-wert' }, 'Alle'),
      el('span', { class: 'kachel-ziel' }, 'Vitamine, Mineralstoffe'),
      el('span', { class: 'kachel-name' }, 'Nährwerte')),
  };
  return el('section', { class: 'kacheln', 'aria-label': 'Makros', style: `--spalten:${kachelSpalten(ringe.length)}` },
    ringe.map((id) => (bauen[id] ? bauen[id]() : makroKachel(datum, id, ist[id] ?? 0, ziel[id]))));
}

function makroKachel(datum, id, ist, ziel) {
  const stand = fortschritt(ist, ziel);
  const { vorher, feiern } = merkeStand(datum, id, stand.anteil);
  const kachel = el('div', {
    class: `kachel makro-${id}${stand.ueber ? ' ueber' : ''}`, role: 'progressbar', 'aria-label': nameVon(id),
    'aria-valuemin': 0, 'aria-valuemax': Math.round(ziel), 'aria-valuenow': Math.round(ist), 'aria-valuetext': `${gramm(ist)} von ${zahl(ziel)} g`,
  },
  ring(stand.anteil, EMOJI[id], vorher),
  el('strong', { class: 'kachel-wert' }, `${gramm(ist)} g`),
  el('span', { class: 'kachel-ziel' }, `von ${zahl(ziel)} g`),
  el('span', { class: 'kachel-name' }, KACHEL_NAME[id] ?? nameVon(id)));
  if (feiern) requestAnimationFrame(() => feiere(kachel));
  return kachel;
}

/** Wasser zählen mit einem Tipp. Ändert sich an Ort und Stelle: Zahl und Ring, die Seite wird nicht neu gezeichnet. */
function wasserKachel(datum, eintraege, zielMl, widget, menge) {
  const anteil = () => (zielMl > 0 ? eintraege.reduce((s, m) => s + m.wert, 0) / zielMl : 0);
  const start = merkeStand(datum, 'wasser', anteil());
  const ringEl = ring(anteil(), EMOJI.wasser, start.vorher);
  const wert = el('strong', { class: 'kachel-wert' });
  const knopf = el('button', { type: 'button', class: 'kachel makro-wasser' },
    ringEl, wert,
    el('span', { class: 'kachel-ziel' }, `von ${zahl(zielMl)} ml`),
    el('span', { class: 'kachel-name' }, 'Wasser ', el('span', { class: 'kachel-plus' }, `+${zahl(menge)}`)));
  const zeige = () => {
    const summe = eintraege.reduce((s, m) => s + m.wert, 0);
    wert.textContent = `${zahl(summe)} ml`;
    knopf.setAttribute('aria-label', `Wasser: ${zahl(summe)} von ${zahl(zielMl)} ml. Tippen für ${zahl(menge)} ml mehr`);
    setzeRing(ringEl, anteil());
    widget(summe);
    // Die Wasser-Zeile in den Tageswerten zeigt dieselbe Zahl
    document.querySelector('.wasser-bereich')?.zeige?.([...eintraege]);
    if (merkeStand(datum, 'wasser', anteil()).feiern) feiere(knopf);
  };
  knopf.addEventListener('click', async () => {
    tippGefuehl();
    const neu = await speicher.speichereMessung({ art: 'wasser', datum, wert: menge });
    eintraege.push(neu);
    zeige();
    hinweis(`${zahl(menge)} ml Wasser.`, { aktion: 'Rückgängig', beiAktion: async () => { await speicher.loescheMessung(neu.id); eintraege.splice(eintraege.indexOf(neu), 1); zeige(); } });
  });
  zeige();
  return knopf;
}

function zeigeAlleNaehrwerte() {
  const details = document.querySelector('.alle-naehrwerte');
  if (!details) return;
  details.open = true;
  const sanft = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  details.scrollIntoView({ behavior: sanft ? 'smooth' : 'auto', block: 'start' });
}

/* ---------- Alle Nährwerte: Tag oder Wochenschnitt ---------- */

function alleNaehrwerte(eintraege, wochenEintraege, woche, referenz) {
  const proWoche = ansicht.modus === 'woche';
  const quelle = proWoche ? wochenEintraege : eintraege;
  const { tage, schnitt } = wochenSchnitt(wochenEintraege);
  const werte = proWoche ? schnitt : summeEintraege(eintraege);
  const fehlt = new Set(luecken(quelle, NAEHRSTOFFE.map((n) => n.id)));
  const stellen = (w) => (w < 1 ? 2 : w < 10 ? 1 : 0);

  const zeilen = (gruppe) => NAEHRSTOFFE
    .filter((n) => n.gruppe === gruppe && typeof werte[n.id] === 'number')
    .map((n) => el('tr', { class: n.unter ? 'unterzeile' : null },
      el('th', { scope: 'row' }, n.name),
      el('td', {}, `${fehlt.has(n.id) ? 'mind. ' : ''}${zahl(werte[n.id], n.id === 'kcal' ? 0 : stellen(werte[n.id]))} ${n.einheit}`),
      referenz.gruppe ? el('td', { class: 'anteil' }, referenz.werte[n.id] ? `${prozent(werte[n.id], referenz.werte[n.id].wert)} %` : '') : null));
  const makros = zeilen('makro');
  const mikros = zeilen('mikro');

  const modusKnopf = (id, text) => el('button', {
    type: 'button', class: 'wahl-knopf', 'aria-pressed': String(ansicht.modus === id), onclick: () => { ansicht.modus = id; neuZeichnen(); },
  }, text);

  let erklaerung = 'Summe dieses Tages.';
  if (proWoche) {
    erklaerung = tage
      ? `Schnitt je Tag aus ${tage} ${tage === 1 ? 'Tag' : 'Tagen'} mit Einträgen, ${formatKurz(woche[0])} bis ${formatKurz(woche[6])}.`
      : `In der Woche vom ${formatKurz(woche[0])} bis ${formatKurz(woche[6])} ist nichts eingetragen.`;
  }

  return el('details', { class: 'aufklappen alle-naehrwerte', open: ansicht.offen ? true : null, ontoggle: (e) => { ansicht.offen = e.target.open; } },
    el('summary', {}, 'Alle Nährwerte'),
    el('div', { class: 'stapel' },
      el('div', { class: 'wahl', role: 'group', 'aria-label': 'Zeitraum' }, modusKnopf('tag', 'Dieser Tag'), modusKnopf('woche', 'Wochenschnitt')),
      el('p', { class: 'klein' }, erklaerung),
      makros.length ? el('table', { class: 'naehrwerte' }, el('caption', {}, 'Makronährstoffe'), el('tbody', {}, makros)) : null,
      mikros.length ? el('table', { class: 'naehrwerte' }, el('caption', {}, 'Vitamine und Mineralstoffe'), el('tbody', {}, mikros)) : null,
      fehlt.size && (makros.length || mikros.length) ? el('p', { class: 'klein' }, '„mind.“ steht dort, wo bei mindestens einer Zutat der Wert fehlt. Die echte Menge liegt dann höher.') : null,
      referenz.gruppe
        ? el('p', { class: 'klein' }, `Prozent: Anteil am Referenzwert der DGE für deine Gruppe (Stand ${referenz.daten.stand}). Er gilt als Schnitt über längere Zeit, nicht für jeden einzelnen Tag. Einstellbar unter Mehr → Referenzwerte.`)
        : el('p', { class: 'klein' }, el('a', { class: 'textlink', href: '#/mehr/referenz' }, 'Referenzgruppe wählen'), ', dann siehst du den Anteil am Referenzwert der DGE.')));
}

/* ---------- Slots ---------- */

export const SLOT_EMOJI = { fruehstueck: '☕', morgensnack: '🍎', mittag: '🍝', nachmittagssnack: '🍌', abend: '🥗', abendsnack: '🥛' };

function slotBereich({ slot, datum, eintraege, vortag, kcal, zielKcal }) {
  const stand = zielKcal > 0 ? `${zahl(kcal)} von ${zahl(zielKcal)} kcal` : `${zahl(kcal)} kcal`;
  const wieVortag = async () => {
    for (const eintrag of kopiereEintraege(vortag, datum)) await speicher.speichereEintrag(eintrag);
    hinweis(`${eintraegeText(vortag.length)} übernommen.`);
    neuZeichnen();
  };
  return el('section', { class: 'slot', id: `slot-${slot.id}` },
    el('div', { class: 'slot-kopf' },
      el('span', { class: 'slot-bild', 'aria-hidden': 'true' }, SLOT_EMOJI[slot.id] ?? '🍽️'),
      el('div', { class: 'slot-text' },
        el('h2', {}, slot.name),
        el('p', { class: 'slot-stand' }, `${stand}${slot.hinweis ? `, ${slot.hinweis}` : ''}`)),
      el('button', {
        type: 'button', class: 'rund plus', 'aria-label': `Zu ${slot.name} hinzufügen`,
        onclick: () => oeffneZutatWahl({ datum, slot: slot.id, beiFertig: neuZeichnen }),
      }, icon('plus'))),
    eintraege.length ? el('ul', { class: 'eintraege' }, eintraege.map((e) => el('li', {},
      el('button', { type: 'button', class: 'eintrag', onclick: () => oeffneEintrag({ eintrag: e, beiFertig: neuZeichnen }) },
        el('span', { class: 'eintrag-name' }, e.name, e.rezeptId ? el('small', {}, 'Rezept') : (e.marke ? el('small', {}, e.marke) : null)),
        el('span', { class: 'eintrag-menge' }, e.schnell ? 'Portion' : `${zahl(e.gramm, 1)} g`),
        el('span', { class: 'eintrag-kcal' }, `${zahl(fuerMenge(e.je100, e.gramm).kcal ?? 0)} kcal`))))) : null,
    // Wer morgens oft dasselbe isst: einmal merken, dann mit einem Tipp beim Plus eintragen
    eintraege.length ? el('button', { type: 'button', class: 'textlink als-vorlage', onclick: () => merkeAlsVorlage({ eintraege, slotName: slot.name }) }, 'Als Mahlzeit merken') : null,
    // Viele essen morgens dasselbe: ein Tipp statt mehrerer Suchen
    !eintraege.length && vortag.length ? el('button', { type: 'button', class: 'chip wie-vortag', onclick: wieVortag },
      `Wie am Vortag: ${eintraegeText(vortag.length)}, ${zahl(summeEintraege(vortag).kcal ?? 0)} kcal`) : null);
}

/* ---------- Tag kopieren ---------- */

function oeffneTagKopieren(datum, heute, eintraege) {
  const vorschlag = datum === heute ? verschiebe(heute, 1) : heute;
  const fehler = el('p', { class: 'fehlertext', role: 'alert' });
  const eingabe = el('input', { type: 'date', id: 'f-kopierziel', value: vorschlag });
  const b = blatt({
    titel: 'Tag kopieren',
    inhalt: el('form', {
      class: 'stapel', novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault();
        const ziel = eingabe.value;
        if (!istGueltig(ziel)) { fehler.textContent = 'Wähle ein Datum.'; return; }
        if (ziel === datum) { fehler.textContent = 'Das ist derselbe Tag.'; return; }
        for (const eintrag of kopiereEintraege(eintraege, ziel)) await speicher.speichereEintrag(eintrag);
        b.schliessen();
        hinweis(`${eintraegeText(eintraege.length)} nach ${formatKurz(ziel)} kopiert.`, { aktion: 'Hingehen', beiAktion: () => gehe(`/heute/${ziel}`) });
      },
    },
    el('p', {}, `${eintraegeText(eintraege.length)} mit ${zahl(summeEintraege(eintraege).kcal ?? 0)} kcal kommen zu dem dazu, was am Zieltag schon steht.`),
    el('div', { class: 'feld' }, el('label', { for: 'f-kopierziel' }, 'Wohin?'), eingabe, fehler),
    el('div', { class: 'knopfreihe' }, el('button', { type: 'submit', class: 'knopf' }, 'Kopieren'))),
  });
}
