// Ansicht "Health": Gewicht mit 7-Tage-Schnitt gegen das Wochenziel, Wasser, Schlaf, Schritte,
// Supplements und Körpermaße. Alles bleibt auf dem Gerät.

import { formatKurz, formatLang, isoDatum, istGueltig, relativ, verschiebe } from '../logik/datum.js';
import {
  ARTEN, artVon, gewichtsTrend, letzterWert, linienPunkte, pruefeGesundheit, pruefeMesswert, tagesSumme, tagesWert, verlauf,
} from '../logik/gesundheit.js';
import { APP_NAME } from '../logik/schema.js';
import { neuZeichnen } from '../router.js';
import * as speicher from '../speicher.js';
import { el, feld, haenge, hinweis, icon, svg, zahl } from '../ui.js';
import { zeigeLabor, zeigeSymptome } from './befunde.js';

const MASSE = ARTEN.filter((a) => a.gruppe === 'mass');
const alsText = (wert) => (typeof wert === 'number' ? String(wert).replace('.', ',') : '');
const mitVorzeichen = (wert, stellen = 1) => `${wert > 0 ? '+' : wert < 0 ? '−' : '±'}${zahl(Math.abs(wert), stellen)}`;

// Was getippt, aber noch nicht gespeichert ist, überlebt ein Neuzeichnen (z. B. nach "+250 ml")
let entwurf = { datum: null, werte: {} };
const aufgeklappt = new Set();

export async function zeigeHealth(wurzel, [parameter]) {
  if (parameter === 'labor') return zeigeLabor(wurzel);
  if (parameter === 'symptome') return zeigeSymptome(wurzel);
  const heute = isoDatum();
  const datum = istGueltig(parameter) ? parameter : heute;
  if (entwurf.datum !== datum) entwurf = { datum, werte: {} };
  const [messungen, ziele, supplements, tag] = await Promise.all([
    speicher.messungenZwischen(verschiebe(datum, -400), datum), speicher.ladeGesundheit(), speicher.alleSupplements(), speicher.holeTag(datum),
  ]);
  document.title = `Health – ${APP_NAME}`;
  const nah = relativ(datum, heute);

  haenge(wurzel,
    el('header', { class: 'tageskopf' },
      el('a', { class: 'rund', href: `#/health/${verschiebe(datum, -1)}`, 'aria-label': 'Einen Tag zurück' }, icon('zurueck')),
      el('div', { class: 'tagestitel' },
        el('h1', {}, 'Health'),
        el('p', {}, nah ? `${nah}, ${formatLang(datum)}` : formatLang(datum)),
        datum !== heute ? el('a', { class: 'textlink', href: '#/health' }, 'Zu heute') : null),
      datum < heute
        ? el('a', { class: 'rund', href: `#/health/${verschiebe(datum, 1)}`, 'aria-label': 'Einen Tag weiter' }, icon('vor'))
        : el('span', { class: 'rund' })),
    el('div', { class: 'knopfreihe mitte' },
      el('a', { class: 'knopf leise klein', href: '#/health/labor' }, 'Laborwerte'),
      el('a', { class: 'knopf leise klein', href: '#/health/symptome' }, 'Symptome')),
    tageswerte(datum, messungen, ziele),
    wasser(datum, messungen, ziele),
    supplementBereich(datum, supplements, tag),
    masseBereich(datum, messungen),
    zielBereich(ziele));
}

/** Wert eines Felds: erst der ungespeicherte Entwurf, sonst der gespeicherte Wert des Tages */
const feldWert = (artId, messungen, datum) => entwurf.werte[artId] ?? alsText(tagesWert(messungen, artId, datum));

/** Mehrere Arten auf einmal speichern; ein geleertes Feld entfernt den Wert des Tages. */
async function speichereArten(artIds, messungen, datum) {
  const fehler = {};
  const arbeit = [];
  for (const artId of artIds) {
    const text = feldWert(artId, messungen, datum).trim();
    if (!text) {
      if (tagesWert(messungen, artId, datum) !== null) arbeit.push(() => speicher.loescheMessung(`${artId}|${datum}`));
      continue;
    }
    const pruefung = pruefeMesswert(artId, text);
    if (pruefung.ok) arbeit.push(() => speicher.speichereMessung({ art: artId, datum, wert: pruefung.wert }));
    else fehler[artId] = pruefung.fehler;
  }
  if (Object.keys(fehler).length) return fehler;
  for (const schritt of arbeit) await schritt();
  for (const artId of artIds) delete entwurf.werte[artId];
  return null;
}

function messFeld(artId, messungen, datum, fehler, zusatz = {}) {
  const art = artVon(artId);
  return feld({
    name: artId.replace(':', '-'), beschriftung: art.name, einheit: art.einheit, inputmode: 'decimal', fehler: fehler?.[artId],
    value: feldWert(artId, messungen, datum), oninput: (e) => { entwurf.werte[artId] = e.target.value; }, ...zusatz,
  });
}

/* ---------- Gewicht, Schlaf, Schritte ---------- */

function tageswerte(datum, messungen, ziele) {
  const bereich = el('section', { class: 'bereich erster' });
  const zeichne = (fehler = null) => {
    const trend = gewichtsTrend(messungen, datum, ziele.wochenzielKg);
    const punkte = verlauf(messungen, 'gewicht', datum, 30);
    const schlaf = tagesWert(messungen, 'schlaf', datum);
    const schritte = tagesWert(messungen, 'schritte', datum);
    bereich.replaceChildren(
      el('h2', {}, 'Tageswerte'),
      el('form', {
        class: 'stapel', novalidate: true,
        onsubmit: async (e) => {
          e.preventDefault();
          const probleme = await speichereArten(['gewicht', 'schlaf', 'schritte'], messungen, datum);
          if (probleme) { zeichne(probleme); bereich.querySelector('[aria-invalid="true"]')?.focus(); return; }
          hinweis('Tageswerte gespeichert.');
          neuZeichnen();
        },
      },
      messFeld('gewicht', messungen, datum, fehler),
      el('p', { class: 'klein', id: 'gewicht-trend' }, trendText(trend, ziele.wochenzielKg)),
      punkte.length >= 2 ? verlaufslinie(punkte) : null,
      el('div', { class: 'raster' }, messFeld('schlaf', messungen, datum, fehler), messFeld('schritte', messungen, datum, fehler, { inputmode: 'numeric' })),
      el('p', { class: 'klein' }, [
        schlaf !== null ? `Schlaf: ${zahl(schlaf, 1)} von ${zahl(ziele.schlafZielH, 1)} h.` : null,
        schritte !== null ? `Schritte: ${zahl(schritte)} von ${zahl(ziele.schritteZiel)}.` : null,
      ].filter(Boolean).join(' ')),
      el('div', { class: 'knopfreihe' }, el('button', { type: 'submit', class: 'knopf' }, 'Tageswerte speichern'))));
  };
  zeichne();
  return bereich;
}

function trendText(trend, ziel) {
  if (trend.status === 'zuWenigDaten') {
    const stand = trend.schnitt !== null ? `Schnitt der letzten 7 Tage: ${zahl(trend.schnitt, 1)} kg aus ${trend.anzahl} ${trend.anzahl === 1 ? 'Wert' : 'Werten'}. ` : '';
    return `${stand}Für den Vergleich mit dem Wochenziel braucht es je 3 Werte in dieser und in der Vorwoche (bisher ${trend.anzahl} und ${trend.anzahlDavor}).`;
  }
  const urteil = { imZiel: 'Das liegt im Ziel.', darueber: `Das sind ${zahl(Math.abs(trend.abweichung), 1)} kg mehr als geplant.`, darunter: `Das sind ${zahl(Math.abs(trend.abweichung), 1)} kg weniger als geplant.` }[trend.status];
  return `7-Tage-Schnitt ${zahl(trend.schnitt, 1)} kg, ${mitVorzeichen(trend.aenderung)} kg zur Vorwoche. Dein Wochenziel: ${mitVorzeichen(ziel, 2)} kg. ${urteil}`;
}

function verlaufslinie(punkte) {
  const werte = punkte.map((p) => p.wert);
  return el('figure', { class: 'verlauf' },
    svg('svg', { viewBox: '0 0 300 64', role: 'img', 'aria-label': `Gewicht der letzten 30 Tage, von ${zahl(Math.min(...werte), 1)} bis ${zahl(Math.max(...werte), 1)} kg`, preserveAspectRatio: 'none' },
      svg('polyline', { points: linienPunkte(werte, 300, 64, 6), fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })),
    el('figcaption', { class: 'klein' }, `${punkte.length} Werte seit ${formatKurz(punkte[0].datum)}, von ${zahl(Math.min(...werte), 1)} bis ${zahl(Math.max(...werte), 1)} kg`));
}

/* ---------- Wasser ---------- */

function wasser(datum, messungen, ziele) {
  const eintraege = messungen.filter((m) => m.art === 'wasser' && m.datum === datum);
  const stand = el('p', { id: 'wasser-stand' });
  const fuellung = el('span', { class: 'balken-voll' });
  const zurueck = el('button', { type: 'button', class: 'textlink', hidden: true }, 'Letzten Schluck zurücknehmen');
  // Wasser ändert sich an Ort und Stelle: kein Neuzeichnen, das andere Eingaben stören könnte
  const zeige = () => {
    const summe = tagesSumme(eintraege, 'wasser', datum);
    stand.textContent = `${zahl(summe)} von ${zahl(ziele.wasserZielMl)} ml`;
    fuellung.style.width = `${Math.min(100, (summe / ziele.wasserZielMl) * 100).toFixed(1)}%`;
    zurueck.hidden = eintraege.length === 0;
  };
  const trinke = async (ml) => { eintraege.push(await speicher.speichereMessung({ art: 'wasser', datum, wert: ml })); zeige(); };
  zurueck.addEventListener('click', async () => { await speicher.loescheMessung(eintraege.pop().id); zeige(); });
  zeige();
  return el('section', { class: 'bereich makro-wasser' },
    el('h2', {}, 'Wasser'),
    stand,
    el('span', { class: 'balken' }, fuellung),
    el('div', { class: 'chips' }, [250, 500, 750].map((ml) => el('button', { type: 'button', class: 'chip', onclick: () => trinke(ml) }, `+ ${ml} ml`))),
    zurueck);
}

/* ---------- Supplements ---------- */

function supplementBereich(datum, supplements, tag) {
  const genommen = new Set(tag?.supplements ?? []);
  const sortiert = [...supplements].sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const stand = el('p', { class: 'klein', id: 'supplement-stand' });
  const zeigeStand = () => { stand.textContent = sortiert.length ? `${sortiert.filter((s) => genommen.has(s.id)).length} von ${sortiert.length} genommen` : ''; };
  const nameFeld = el('input', { id: 'f-supplement-name', 'aria-label': 'Name des Supplements', placeholder: 'Name', maxlength: 60, autocomplete: 'off' });
  const dosisFeld = el('input', { id: 'f-supplement-dosis', 'aria-label': 'Dosis', placeholder: 'Dosis, z. B. 5 g', maxlength: 40, autocomplete: 'off' });
  zeigeStand();
  return el('section', { class: 'bereich' },
    el('h2', {}, 'Supplements'),
    sortiert.length ? stand : el('p', { class: 'leer' }, 'Lege an, was du täglich nimmst. Dann hakst du es hier ab.'),
    sortiert.length ? el('ul', { class: 'zeilen' }, sortiert.map((s) => el('li', { class: genommen.has(s.id) ? 'haken erledigt' : 'haken' },
      el('label', {},
        el('input', {
          type: 'checkbox', checked: genommen.has(s.id) ? true : null,
          onchange: async (e) => {
            if (e.target.checked) genommen.add(s.id); else genommen.delete(s.id);
            e.target.closest('.haken').classList.toggle('erledigt', e.target.checked);
            await speicher.setzeSupplementGenommen(datum, s.id, e.target.checked);
            zeigeStand();
          },
        }),
        el('span', { class: 'zeile-name' }, s.name, s.dosis ? el('small', {}, s.dosis) : null)),
      el('button', {
        type: 'button', class: 'rund', 'aria-label': `${s.name} aus der Liste entfernen`,
        onclick: async () => {
          await speicher.loescheSupplement(s.id);
          hinweis(`${s.name} entfernt.`, { aktion: 'Rückgängig', beiAktion: async () => { await speicher.speichereSupplement(s); neuZeichnen(); } });
          neuZeichnen();
        },
      }, icon('zu', 20))))) : null,
    el('form', {
      class: 'zusatz zweifach',
      onsubmit: async (e) => {
        e.preventDefault();
        const name = nameFeld.value.trim();
        if (!name) { nameFeld.focus(); return; }
        await speicher.speichereSupplement({ name, dosis: dosisFeld.value.trim() });
        neuZeichnen();
      },
    }, nameFeld, dosisFeld, el('button', { type: 'submit', class: 'knopf leise' }, 'Dazu')));
}

/* ---------- Körpermaße ---------- */

function masseBereich(datum, messungen) {
  const bereich = el('details', { class: 'bereich aufklappen', open: aufgeklappt.has('masse') ? true : null, ontoggle: (e) => { if (e.target.open) aufgeklappt.add('masse'); else aufgeklappt.delete('masse'); } });
  const zeichne = (fehler = null) => {
    bereich.replaceChildren(
      el('summary', {}, 'Körpermaße'),
      el('form', {
        class: 'stapel', novalidate: true,
        onsubmit: async (e) => {
          e.preventDefault();
          const probleme = await speichereArten(MASSE.map((a) => a.id), messungen, datum);
          if (probleme) { zeichne(probleme); bereich.querySelector('[aria-invalid="true"]')?.focus(); return; }
          hinweis('Maße gespeichert.');
          neuZeichnen();
        },
      },
      el('p', { class: 'klein' }, 'Immer an derselben Stelle und zur selben Tageszeit messen, sonst sind die Werte nicht vergleichbar.'),
      el('div', { class: 'raster' }, MASSE.map((art) => {
        const letzter = letzterWert(messungen, art.id, verschiebe(datum, -1));
        return messFeld(art.id, messungen, datum, fehler, { placeholder: letzter ? `zuletzt ${zahl(letzter.wert, 1)}` : '' });
      })),
      el('div', { class: 'knopfreihe' }, el('button', { type: 'submit', class: 'knopf' }, 'Maße speichern'))));
  };
  zeichne();
  return bereich;
}

/* ---------- Ziele ---------- */

function zielBereich(ziele) {
  const eingabe = Object.fromEntries(Object.entries(ziele).map(([id, wert]) => [id, alsText(wert)]));
  const bereich = el('details', { class: 'bereich aufklappen', open: aufgeklappt.has('ziele') ? true : null, ontoggle: (e) => { if (e.target.open) aufgeklappt.add('ziele'); else aufgeklappt.delete('ziele'); } });
  const zeile = (id, beschriftung, einheit, fehler) => feld({
    name: `ziel-${id}`, beschriftung, einheit, inputmode: 'decimal', value: eingabe[id], fehler: fehler[id], oninput: (e) => { eingabe[id] = e.target.value; },
  });
  const zeichne = (fehler = {}) => {
    bereich.replaceChildren(
      el('summary', {}, 'Ziele für Health'),
      el('form', {
        class: 'stapel', novalidate: true,
        onsubmit: async (e) => {
          e.preventDefault();
          const pruefung = pruefeGesundheit(eingabe);
          if (!pruefung.ok) { zeichne(pruefung.fehler); bereich.querySelector('[aria-invalid="true"]')?.focus(); return; }
          await speicher.setzeEinstellung('gesundheit', pruefung.ziele);
          hinweis('Ziele gespeichert.');
          neuZeichnen();
        },
      },
      el('p', { class: 'klein' }, 'Wochenziel Gewicht: plus zum Zunehmen, minus zum Abnehmen, 0 zum Halten. Die Startwerte sind Platzhalter, keine Empfehlung.'),
      el('div', { class: 'raster' },
        zeile('wochenzielKg', 'Gewicht je Woche', 'kg', fehler),
        zeile('wasserZielMl', 'Wasser am Tag', 'ml', fehler),
        zeile('schlafZielH', 'Schlaf', 'h', fehler),
        zeile('schritteZiel', 'Schritte am Tag', '', fehler)),
      el('div', { class: 'knopfreihe' }, el('button', { type: 'submit', class: 'knopf' }, 'Ziele speichern'))));
  };
  zeichne();
  return bereich;
}
