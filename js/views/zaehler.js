// Zähler-Karte: Gemüse, Obst, Ballaststoffe und alle Mikronährstoffe – für den Tag oder als Wochendurchschnitt.
import { el, zahl } from '../ui.js';
import { NAEHRSTOFFE } from '../logic/naehrstoffe.js';
import { referenzwerte, bewerte } from '../logic/referenzwerte.js';

const STATUS_TEXT = {
  ueber_obergrenze: 'über der Obergrenze',
  zu_viel: 'über dem Richtwert',
};

/** Ein Balken mit Beschriftung „ist / ziel“. */
export function balkenZeile(name, ist, ziel, einheit, status, hinweis = '') {
  const anteil = ziel > 0 ? Math.min(100, (ist / ziel) * 100) : 0;
  return el('div', { class: `zaehler-zeile status-${status}` },
    el('div', { class: 'zeile klein' },
      el('span', {}, name),
      el('span', {}, `${zahl(runde(ist))} / ${zahl(runde(ziel))} ${einheit}`)),
    el('div', { class: 'balken' }, el('div', { style: `width:${anteil}%` })),
    hinweis ? el('p', { class: 'warnung klein' }, hinweis) : null);
}

function runde(wert) {
  if (wert >= 100) return Math.round(wert);
  if (wert >= 10) return Math.round(wert * 10) / 10;
  return Math.round(wert * 100) / 100;
}

/**
 * daten: { werte, gemueseObst, typ, referenzgruppe, titel }
 */
export function zaehlerInhalt({ werte, gemueseObst, typ, referenzgruppe }) {
  const ref = referenzwerte(referenzgruppe, typ);
  const zeile = (k) => {
    const n = NAEHRSTOFFE[k];
    const ist = werte[k] ?? 0;
    const { status } = bewerte(ist, ref[k]);
    const hinweis = STATUS_TEXT[status]
      ? `${STATUS_TEXT[status]}${ref[k].obergrenze ? ` (${zahl(ref[k].obergrenze)} ${n.einheit})` : ''}`
      : '';
    return balkenZeile(n.name, ist, ref[k].wert, n.einheit, status, hinweis);
  };
  const oben = ['ballaststoffe', 'epaDha', 'gesFett', 'natrium'];
  const gruppe = (titel, gruppenName) => {
    const schluessel = Object.keys(NAEHRSTOFFE)
      .filter((k) => NAEHRSTOFFE[k].gruppe === gruppenName && ref[k] && !oben.includes(k));
    return el('details', { class: 'zaehler-gruppe' },
      el('summary', {}, `${titel} ${zusammenfassung(schluessel, werte, ref)}`),
      ...schluessel.map(zeile));
  };

  return [
    balkenZeile('Gemüse', gemueseObst.gemuese, typ.gemueseG, 'g', gemueseObst.gemuese >= typ.gemueseG ? 'erreicht' : 'niedrig'),
    balkenZeile('Obst', gemueseObst.obst, typ.obstG, 'g', gemueseObst.obst >= typ.obstG ? 'erreicht' : 'niedrig'),
    ...oben.map(zeile),
    gruppe('Vitamine', 'vitamin'),
    gruppe('Mineralstoffe', 'mineral'),
    el('p', { class: 'leise klein' },
      'Referenzwerte: DGE (Erwachsene), Obergrenzen: EFSA. Orientierung, keine medizinische Beratung. '
      + 'Jod fehlt in den USDA-Daten fast immer.'),
  ];
}

/** „(9/11 ✓)“ – wie viele Ziele erreicht sind; mit ⚠ bei Überschreitungen. */
function zusammenfassung(schluessel, werte, ref) {
  let erreicht = 0;
  let warnung = false;
  for (const k of schluessel) {
    const { status } = bewerte(werte[k] ?? 0, ref[k]);
    if (status === 'erreicht' || status === 'ok') erreicht++;
    if (status === 'ueber_obergrenze' || status === 'zu_viel') warnung = true;
  }
  return `(${erreicht}/${schluessel.length} ✓${warnung ? ' · ⚠' : ''})`;
}
