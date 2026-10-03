// Gewicht: Verlauf, Wochendurchschnitte, Fortschritt zum Ziel und wöchentlicher Kalorien-Vorschlag.
import { el, setze, zahl } from '../ui.js';
import { alleEintraege } from '../db.js';
import { holeProfil, speichereProfil } from '../state.js';
import { datumSchluessel } from '../logic/ziele.js';
import { zielGewicht } from '../logic/bedarf.js';
import {
  gewichtsReihe, gleitenderDurchschnitt, durchschnitt, anpassungsVorschlag, wendeAnpassungAn, zielRate,
} from '../logic/gewicht.js';
import { gewichtsDiagramm } from './gewicht-diagramm.js';

const datumFormat = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' });
const alsDatum = (s) => new Date(`${s}T12:00:00`);
const kg = (w) => `${zahl(Math.round(w * 10) / 10)} kg`;
const zweiStellen = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });
const mitVorzeichen = (w, einheit) => {
  const gerundet = Math.round(w * 100) / 100;
  return `${gerundet > 0 ? '+' : gerundet < 0 ? '−' : '±'}${zweiStellen.format(Math.abs(gerundet))} ${einheit}`;
};
const datumLang = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'numeric', year: 'numeric' });

export async function holeGewichtsReihe() {
  return gewichtsReihe((await alleEintraege('tage')).map(([, tag]) => tag));
}

export const gewicht = {
  titel: 'Gewicht',
  reiter: 'mehr',
  render() {
    const wurzel = el('div');
    Promise.all([holeProfil(), holeGewichtsReihe()])
      .then(([profil, reihe]) => zeichne(wurzel, profil, reihe))
      .catch((fehler) => setze(wurzel, el('p', { class: 'warnung' }, fehler.message)));
    return wurzel;
  },
};

function zeichne(wurzel, profil, reihe) {
  const heute = datumSchluessel(new Date());
  const ziel = profil.ziel;
  const glatt = gleitenderDurchschnitt(reihe);
  const vorschlag = anpassungsVorschlag(reihe, ziel, heute, ziel.letzteEntscheidung ?? null);

  // Plan: vom Ø der ersten Woche ab Start bis zum erwarteten Zielgewicht
  const abStart = reihe.filter((m) => m.datum >= ziel.startDatum);
  const startKg = abStart.length ? durchschnitt(abStart, abStart[Math.min(6, abStart.length - 1)].datum, 7, 1) : null;
  const ende = new Date(alsDatum(ziel.startDatum).getTime() + ziel.wochen * 7 * 86400000);
  const plan = startKg != null && ziel.art !== 'halten'
    ? [{ datum: ziel.startDatum, kg: startKg }, { datum: datumSchluessel(ende), kg: zielGewicht(startKg, ziel) }]
    : null;

  setze(wurzel,
    reihe.length ? null : el('section', { class: 'karte' },
      el('p', {}, 'Noch keine Messungen. Trage dein Gewicht morgens unter „Heute“ ein.')),
    reihe.length ? statusKarte(reihe, heute, ziel, startKg) : null,
    vorschlagKarte(wurzel, profil, vorschlag, heute),
    reihe.length ? el('section', { class: 'karte' }, el('h2', {}, 'Verlauf'), gewichtsDiagramm(reihe, glatt, plan)) : null,
    reihe.length ? tabelle(reihe, glatt) : null);
}

function statusKarte(reihe, heute, ziel, startKg) {
  const aktuell = durchschnitt(reihe, heute, 7, 1);
  const wocheNr = Math.floor((alsDatum(heute) - alsDatum(ziel.startDatum)) / (7 * 86400000)) + 1;
  const zielKg = startKg != null ? zielGewicht(startKg, ziel) : null;
  return el('section', { class: 'karte' },
    el('h2', {}, '⚖️ Stand'),
    aktuell != null ? el('p', { class: 'grosszahl' }, `Ø ${kg(aktuell)}`) : el('p', { class: 'leise' }, 'Keine Messung in den letzten 7 Tagen.'),
    el('p', { class: 'klein' }, `Plan: ${mitVorzeichen(zielRate(ziel), 'kg/Woche')}`
      + (ziel.art === 'halten' ? ''
        : wocheNr < 1 ? ` · startet am ${datumLang.format(alsDatum(ziel.startDatum))}`
          : wocheNr > ziel.wochen ? ` · Plan abgeschlossen (${ziel.wochen} Wochen)`
            : ` · Woche ${wocheNr} von ${ziel.wochen}`)),
    startKg != null && zielKg != null && ziel.art !== 'halten'
      ? el('p', { class: 'klein' }, `Start Ø ${kg(startKg)} → Ziel ca. ${kg(zielKg)}`
        + (aktuell != null ? ` · bisher ${mitVorzeichen(aktuell - startKg, 'kg')}` : ''))
      : null);
}

function vorschlagKarte(wurzel, profil, vorschlag, heute) {
  const neuLaden = async () => zeichne(wurzel, await holeProfil(), await holeGewichtsReihe());
  const entscheide = async (annehmen) => {
    const neu = structuredClone(profil);
    if (annehmen) wendeAnpassungAn(neu, vorschlag.kcalProTag);
    neu.ziel.letzteEntscheidung = heute;
    await speichereProfil(neu);
    neuLaden();
  };

  const gemessen = vorschlag.rate != null
    ? el('p', { class: 'klein' }, `Letzte 7 Tage Ø ${kg(vorschlag.aktuell)} · Vorwoche Ø ${kg(vorschlag.vorwoche)} → `
      + `${mitVorzeichen(vorschlag.rate, 'kg/Woche')} (Plan ${mitVorzeichen(vorschlag.soll, 'kg/Woche')})`)
    : null;

  const inhalt = {
    zu_wenig_daten: [el('p', { class: 'leise klein' },
      'Ein Vorschlag kommt, sobald 2 Wochen mit je mindestens 3 Messungen vorliegen. Am besten jeden Morgen nach dem Aufstehen wiegen.')],
    warten: [gemessen, el('p', { class: 'leise klein' }, 'Diese Woche wurde schon entschieden. Nächster Vorschlag in einigen Tagen.')],
    im_plan: [gemessen, el('p', {}, '✓ Du liegst im Plan – keine Anpassung nötig.')],
    anpassen: [
      gemessen,
      el('div', { class: 'vorschlag' },
        el('p', {}, el('strong', {}, `Vorschlag: ${mitVorzeichen(vorschlag.kcalProTag, 'kcal pro Tag')}`)),
        el('ul', { class: 'liste-einfach klein' }, ...profil.tagestypen.map((t) => el('li', {},
          `${t.name}: ${zahl(t.kcal)} → ${zahl(t.kcal + vorschlag.kcalProTag)} kcal`))),
        el('p', { class: 'leise klein' }, 'Protein bleibt gleich, KH und Fett ändern sich im bisherigen Verhältnis. '
          + 'Denk daran, die Ziele auch in Yazio anzupassen.'),
        el('div', { class: 'knopfreihe' },
          el('button', { class: 'knopf', type: 'button', onclick: () => entscheide(true) }, 'Übernehmen'),
          el('button', { class: 'knopf zweitrangig', type: 'button', onclick: () => entscheide(false) }, 'Diese Woche nicht'))),
    ],
  }[vorschlag.status];

  return el('section', { class: 'karte' }, el('h2', {}, 'Kalorien-Anpassung'), ...inhalt);
}

function tabelle(reihe, glatt) {
  const letzte = reihe.slice(-14).reverse();
  return el('section', { class: 'karte' },
    el('details', {},
      el('summary', {}, `Messungen (${reihe.length})`),
      el('table', { class: 'tabelle' },
        el('thead', {}, el('tr', {}, el('th', {}, 'Tag'), el('th', {}, 'Gewicht'), el('th', {}, 'Ø 7 Tage'))),
        el('tbody', {}, ...letzte.map((m) => {
          const schnitt = glatt.find((g) => g.datum === m.datum)?.kg;
          return el('tr', {},
            el('td', {}, datumFormat.format(alsDatum(m.datum))),
            el('td', {}, kg(m.kg)),
            el('td', {}, schnitt != null ? kg(schnitt) : '–'));
        }))),
      reihe.length > 14 ? el('p', { class: 'leise klein' }, 'Die letzten 14 Messungen. Ändern über „Heute“ (Datum zurückblättern).') : null));
}
