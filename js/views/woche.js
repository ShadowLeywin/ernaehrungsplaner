// Wochenplaner: Mo–So mit Tagestyp, geplanten Workouts und geplanten Mahlzeiten (Rezepte oder Lebensmittel).
// Geplantes kann in den echten Tag übernommen werden. Dazu Obst-/Gemüse-Vorschläge nach Vorlieben und Angeboten.
import { el, setze, zahl } from '../ui.js';
import { icon } from '../icons.js';
import { episch } from '../darstellung.js';
import { lese, schreibe } from '../db.js';
import { holeProfil, holeTag, speichereTag } from '../state.js';
import { holeLebensmittel } from '../lebensmittel.js';
import { datumSchluessel, tagestypFuerDatum } from '../logic/ziele.js';
import { neueEintragsId } from '../logic/tag.js';
import { montagVon } from '../logic/fortschritt.js';
import { leererPlan, planTagNaehrwerte, planAlsEintraege, obstGemueseVorschlaege } from '../logic/wochenplan.js';
import { vorlagenFuerTag } from '../logic/vorlagen.js';
import { angeboteJeLebensmittel } from '../logic/angebote.js';
import { holeAktuelleAngebote } from '../angebote-speicher.js';
import { WOCHENTAGE } from '../logic/profil.js';
import { oeffneEintragDialog } from './eintrag-dialog.js';

let wochenVersatz = 0;
let offenerTag = null;
const datumKurz = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'numeric' });

export const woche = {
  get titel() { return episch('Kriegsrat der Woche', 'Woche'); },
  render() {
    const wurzel = el('div', {}, el('p', { class: 'leise' }, 'Lade …'));
    lade(wurzel);
    return wurzel;
  },
};

export async function holePlan(montag) {
  const alle = (await lese('einstellungen', 'wochenplaene')) ?? {};
  return alle[montag] ?? leererPlan();
}

export async function speicherePlan(montag, plan) {
  const alle = (await lese('einstellungen', 'wochenplaene')) ?? {};
  alle[montag] = plan;
  // Nur die letzten 12 Wochen behalten
  const schluessel = Object.keys(alle).sort();
  for (const alt of schluessel.slice(0, Math.max(0, schluessel.length - 12))) delete alle[alt];
  await schreibe('einstellungen', 'wochenplaene', alle);
}

export function aktuellerMontag(versatz = 0) {
  const m = montagVon(new Date());
  return new Date(m.getFullYear(), m.getMonth(), m.getDate() + versatz * 7);
}

async function lade(wurzel) {
  const montagDatum = aktuellerMontag(wochenVersatz);
  const montag = datumSchluessel(montagDatum);
  const [profil, daten, plan, vorlagen, praeferenzen, angebote] = await Promise.all([
    holeProfil(), holeLebensmittel(), holePlan(montag), lese('einstellungen', 'vorlagen'), lese('einstellungen', 'praeferenzen'), holeAktuelleAngebote(),
  ]);
  const k = { wurzel, profil, daten, plan, montag, montagDatum, vorlagen: vorlagen ?? [], praeferenzen: praeferenzen ?? {}, angebote };
  zeichne(k);
}

function zeichne(k) {
  const speichern = async () => { await speicherePlan(k.montag, k.plan); zeichne(k); };
  const heute = datumSchluessel(new Date());
  const angeboteMap = angeboteJeLebensmittel(k.angebote, k.daten.basis);
  const vorschlaege = obstGemueseVorschlaege(k.daten.basis, k.praeferenzen, new Set(angeboteMap.keys()));
  const sonntag = new Date(k.montagDatum.getFullYear(), k.montagDatum.getMonth(), k.montagDatum.getDate() + 6);

  setze(k.wurzel,
    el('div', { class: 'datumsleiste' },
      el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Vorherige Woche', onclick: () => { wochenVersatz -= 1; lade(k.wurzel); } }, icon('zurueck', 22)),
      el('div', { style: 'text-align:center' },
        el('strong', {}, `${datumKurz.format(k.montagDatum)} – ${datumKurz.format(sonntag)}`),
        wochenVersatz ? el('div', {}, el('button', { class: 'chip', type: 'button', style: 'min-height:30px;padding:3px 12px;margin-top:4px', onclick: () => { wochenVersatz = 0; lade(k.wurzel); } }, 'Diese Woche')) : null),
      el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Nächste Woche', onclick: () => { wochenVersatz += 1; lade(k.wurzel); } }, icon('weiter', 22))),
    el('div', { class: 'chips woche-links' },
      el('a', { class: 'chip', href: '#/angebote' }, icon('angebote', 16), k.angebote.length ? `Angebote (${k.angebote.length})` : 'Angebote'),
      el('a', { class: 'chip', href: '#/vorlieben' }, icon('lebensmittel', 16), 'Vorlieben'),
      el('a', { class: 'chip', href: '#/rezepte' }, icon('rezepte', 16), 'Rezepte')),
    el('div', { class: 'knopfreihe' },
      el('a', { class: 'knopf', href: `#/einkauf/${k.montag}` }, icon('einkauf', 18), 'Einkaufsliste'),
      el('button', {
        class: 'knopf zweitrangig', type: 'button',
        onclick: async () => {
          const vorher = datumSchluessel(new Date(k.montagDatum.getFullYear(), k.montagDatum.getMonth(), k.montagDatum.getDate() - 7));
          k.plan = structuredClone(await holePlan(vorher));
          await speichern();
        },
      }, 'Vorwoche kopieren')),
    ...WOCHENTAGE.map((name, i) => {
      const datum = new Date(k.montagDatum.getFullYear(), k.montagDatum.getMonth(), k.montagDatum.getDate() + i);
      return tagKarte(k, i, name, datum, datumSchluessel(datum) === heute, speichern);
    }),
    el('section', { class: 'karte' },
      el('div', { class: 'zeile' }, el('h2', {}, episch('Was der Garten hergibt', 'Obst & Gemüse')), el('a', { class: 'klein', href: '#/vorlieben' }, 'Vorlieben →')),
      el('p', { class: 'leise klein' }, 'Vorschläge nach deinen Noten, Angebote zuerst.'),
      el('div', { class: 'chips' }, ...vorschlaege.map(({ lm, note, angebot }) => el('span', { class: `marke${angebot ? ' angebot-marke' : ''}` },
        `${lm.name} ${note}/10${angebot ? ' · Angebot' : ''}`)))));
}

function tagKarte(k, i, name, datum, istHeute, speichern) {
  const tagPlan = k.plan.tage[i];
  const { typ, notiz } = tagestypFuerDatum(k.profil, datum);
  const summe = planTagNaehrwerte(tagPlan, k.daten.lebensmittel);
  const workouts = vorlagenFuerTag(k.vorlagen, datum);
  const nachId = new Map(k.daten.lebensmittel.map((l) => [l.id, l]));
  const anzahl = Object.values(tagPlan).reduce((s, l) => s + l.length, 0);
  const status = el('span', { class: 'leise klein', role: 'status' });
  const schluessel = datumSchluessel(datum);

  const hinzufuegen = (mahlzeit) => oeffneEintragDialog({
    lebensmittel: k.daten.lebensmittel,
    einstellung: k.profil.ernaehrung,
    titel: `${name}: ${k.profil.mahlzeiten.find((m) => m.id === mahlzeit)?.name}`,
    beiSpeichern: (id, gramm) => { (tagPlan[mahlzeit] ??= []).push({ id, gramm }); offenerTag = i; speichern(); },
  });

  return el('details', {
    class: `karte plan-tag${istHeute ? ' heute' : ''}`, open: offenerTag === i || (offenerTag == null && istHeute),
    ontoggle: (e) => { if (e.currentTarget.open) offenerTag = i; },
  },
  el('summary', {},
    el('div', { class: 'zeile' },
      el('strong', {}, `${name} `, el('span', { class: 'leise klein' }, datumKurz.format(datum))),
      el('span', { class: 'leise klein' }, anzahl ? `${zahl(Math.round(summe.kcal ?? 0))} / ${zahl(typ.kcal)} kcal geplant` : 'nichts geplant')),
    el('div', { class: 'chips' },
      el('span', { class: 'marke' }, typ.name),
      notiz ? el('span', { class: 'marke' }, notiz) : null,
      ...workouts.map((v) => el('span', { class: 'marke' }, `🏋 ${v.name}${v.uhrzeit ? ` ${v.uhrzeit}` : ''}`)))),
  ...k.profil.mahlzeiten.map((m) => el('div', { class: 'plan-mahlzeit' },
    el('div', { class: 'zeile' },
      el('span', { class: 'klein' }, el('strong', {}, m.name)),
      el('button', { class: 'knopf-klein', type: 'button', 'aria-label': `${m.name} planen`, onclick: () => hinzufuegen(m.id) }, icon('plus', 18))),
    ...(tagPlan[m.id] ?? []).map((p, j) => el('div', { class: 'plan-posten' },
      el('span', {}, nachId.get(p.id)?.name ?? p.id, el('span', { class: 'leise' }, ` ${zahl(p.gramm)} g`)),
      el('button', {
        class: 'knopf-klein', type: 'button', 'aria-label': 'Entfernen',
        onclick: () => { tagPlan[m.id].splice(j, 1); offenerTag = i; speichern(); },
      }, icon('schliessen', 16)))))),
  anzahl ? el('div', { class: 'knopfreihe' },
    el('button', {
      class: 'knopf zweitrangig', type: 'button',
      onclick: async () => {
        const tag = await holeTag(schluessel);
        tag.eintraege.push(...planAlsEintraege(tagPlan, neueEintragsId));
        await speichereTag(tag);
        status.textContent = `✓ ${anzahl} Einträge in ${istHeute ? 'heute' : name} übernommen`;
      },
    }, 'In den Tag übernehmen'),
    status) : null);
}
