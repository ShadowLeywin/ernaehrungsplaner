// Ansicht "Heute": das Tagebuch eines Tages mit sechs Slots, Tagesscheibe, Makros und allen Nährwerten.

import { backupFaellig } from '../logik/backup.js';
import { formatKurz, formatLang, isoDatum, istGueltig, relativ, verschiebe } from '../logik/datum.js';
import { MAKROS, NAEHRSTOFFE, fuerMenge, luecken, summeEintraege } from '../logik/naehrwerte.js';
import { fuellRadius, segmente, sektorPfad } from '../logik/scheibe.js';
import { APP_NAME } from '../logik/schema.js';
import { alsEintraege } from '../logik/plan.js';
import { kopiereEintraege, wochenSchnitt, wochenTage } from '../logik/woche.js';
import { TAGESTYPEN, fortschritt, tagestypFuer } from '../logik/ziele.js';
import { gehe, neuZeichnen } from '../router.js';
import * as speicher from '../speicher.js';
import { blatt, el, gramm, haenge, hinweis, icon, svg, zahl } from '../ui.js';
import { oeffneEintrag, oeffneZutatWahl } from './eintrag.js';

const nameVon = (id) => NAEHRSTOFFE.find((n) => n.id === id).name;
const eintraegeText = (n) => `${n} ${n === 1 ? 'Eintrag' : 'Einträge'}`;

// Bleibt beim Neuzeichnen erhalten: ist "Alle Nährwerte" aufgeklappt, und zeigt es den Tag oder die Woche?
const ansicht = { offen: false, modus: 'tag' };

export async function zeigeHeute(wurzel, [parameter]) {
  const heute = isoDatum();
  const datum = istGueltig(parameter) ? parameter : heute;
  const woche = wochenTage(datum);
  const [eintraege, ziele, wochenplan, tag, slots, wochenEintraege, vortag, plan, letztesBackup, anzahlEintraege] = await Promise.all([
    speicher.eintraegeAm(datum), speicher.ladeZiele(), speicher.ladeWoche(), speicher.holeTag(datum), speicher.ladeSlots(),
    speicher.eintraegeZwischen(woche[0], woche[6]), speicher.eintraegeAm(verschiebe(datum, -1)), speicher.planAm(datum),
    speicher.einstellung('letztesBackup'), speicher.anzahlEintraege(),
  ]);
  const lautPlan = tagestypFuer(datum, wochenplan, null);
  const typ = tagestypFuer(datum, wochenplan, tag);
  const ziel = ziele[typ];
  const ist = summeEintraege(eintraege);
  const imSlot = (liste, slot) => liste.filter((e) => e.slot === slot.id).sort((a, b) => String(a.erstellt).localeCompare(String(b.erstellt)));
  const kcalJeSlot = Object.fromEntries(slots.map((s) => [s.id, summeEintraege(imSlot(eintraege, s)).kcal ?? 0]));

  document.title = `${relativ(datum, heute) ?? formatLang(datum)} – ${APP_NAME}`;
  haenge(wurzel,
    kopf(datum, heute),
    tagestypWahl(datum, typ, lautPlan),
    geplantHinweis(plan.filter((p) => !p.uebernommen), datum),
    uebersicht(ist, ziel, slots, kcalJeSlot),
    alleNaehrwerte(eintraege, wochenEintraege, woche),
    eintraege.length === 0 && !plan.some((p) => !p.uebernommen) ? el('p', { class: 'leer' }, 'Noch nichts eingetragen. Tippe bei einer Mahlzeit auf das Plus.') : null,
    el('div', { class: 'slots' }, slots.map((slot) => slotBereich({
      slot, datum, eintraege: imSlot(eintraege, slot), vortag: imSlot(vortag, slot), kcal: kcalJeSlot[slot.id], zielKcal: ziel.kcal * slot.anteil,
    }))),
    eintraege.length ? el('div', { class: 'knopfreihe' },
      el('button', { type: 'button', class: 'knopf leise', onclick: () => oeffneTagKopieren(datum, heute, eintraege) }, 'Diesen Tag kopieren')) : null,
    backupErinnerung(backupFaellig(letztesBackup, heute, anzahlEintraege)),
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
    el('a', { class: 'textlink', href: '#/mehr' }, 'Zum Backup'));
}

/* ---------- Übersicht: Tagesscheibe und Makros ---------- */

function uebersicht(ist, ziel, slots, kcalJeSlot) {
  const kcal = fortschritt(ist.kcal ?? 0, ziel.kcal);
  return el('section', { class: 'uebersicht', 'aria-label': 'Tagesstand' },
    el('div', { class: 'scheibe-rahmen' },
      tagesscheibe(slots, kcalJeSlot, ziel.kcal),
      el('div', { class: kcal.ueber ? 'scheibe-mitte ueber' : 'scheibe-mitte' },
        el('strong', {}, zahl(Math.abs(kcal.rest))),
        el('span', {}, kcal.ueber ? 'kcal drüber' : 'kcal übrig'))),
    el('p', { class: 'kcal-zeile' }, `${zahl(ist.kcal ?? 0)} von ${zahl(ziel.kcal)} kcal gegessen`),
    el('ul', { class: 'makros' }, MAKROS.map((id) => makroZeile(id, ist[id] ?? 0, ziel[id]))));
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

function makroZeile(id, ist, ziel) {
  const stand = fortschritt(ist, ziel);
  return el('li', { class: `makro makro-${id}${stand.ueber ? ' ueber' : ''}` },
    el('span', { class: 'makro-name' }, nameVon(id)),
    el('span', { class: 'makro-wert' }, `${gramm(ist)} von ${zahl(ziel)} g`),
    el('span', { class: 'balken', role: 'progressbar', 'aria-label': nameVon(id), 'aria-valuemin': 0, 'aria-valuemax': Math.round(ziel), 'aria-valuenow': Math.round(ist) },
      el('span', { class: 'balken-voll', style: `width:${Math.min(100, stand.anteil * 100).toFixed(1)}%` })));
}

/* ---------- Alle Nährwerte: Tag oder Wochenschnitt ---------- */

function alleNaehrwerte(eintraege, wochenEintraege, woche) {
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
      el('td', {}, `${fehlt.has(n.id) ? 'mind. ' : ''}${zahl(werte[n.id], n.id === 'kcal' ? 0 : stellen(werte[n.id]))} ${n.einheit}`)));
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
      el('p', { class: 'klein' }, 'Referenzwerte zum Vergleich folgen in einer späteren Version.')));
}

/* ---------- Slots ---------- */

function slotBereich({ slot, datum, eintraege, vortag, kcal, zielKcal }) {
  const stand = zielKcal > 0 ? `${zahl(kcal)} von ${zahl(zielKcal)} kcal` : `${zahl(kcal)} kcal`;
  const wieVortag = async () => {
    for (const eintrag of kopiereEintraege(vortag, datum)) await speicher.speichereEintrag(eintrag);
    hinweis(`${eintraegeText(vortag.length)} übernommen.`);
    neuZeichnen();
  };
  return el('section', { class: 'slot', id: `slot-${slot.id}` },
    el('div', { class: 'slot-kopf' },
      el('div', {},
        el('h2', {}, slot.name),
        el('p', { class: 'slot-stand' }, `${stand}${slot.hinweis ? `, ${slot.hinweis}` : ''}`)),
      el('button', {
        type: 'button', class: 'rund plus', 'aria-label': `Zu ${slot.name} hinzufügen`,
        onclick: () => oeffneZutatWahl({ datum, slot: slot.id, beiFertig: neuZeichnen }),
      }, icon('plus'))),
    eintraege.length ? el('ul', { class: 'eintraege' }, eintraege.map((e) => el('li', {},
      el('button', { type: 'button', class: 'eintrag', onclick: () => oeffneEintrag({ eintrag: e, beiFertig: neuZeichnen }) },
        el('span', { class: 'eintrag-name' }, e.name, e.rezeptId ? el('small', {}, 'Rezept') : (e.marke ? el('small', {}, e.marke) : null)),
        el('span', { class: 'eintrag-menge' }, `${zahl(e.gramm, 1)} g`),
        el('span', { class: 'eintrag-kcal' }, `${zahl(fuerMenge(e.je100, e.gramm).kcal ?? 0)} kcal`))))) : null,
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
