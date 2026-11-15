// Unterwegs-Rechner: Bestellung aus gespeicherten Gerichten zusammentippen (Restaurant wählen, Anzahl mit
// Plus und Minus), Summe sehen, mit einem Tipp eintragen. Die Gerichte legt man einmal an oder lädt sie aus
// einer Datei (docs/UNTERWEGS-FORMAT.md). Elan liefert keine Werte von Ketten mit: die ändern sich, und
// ein falscher Nährwert ist schlimmer als keiner.

import { bereinigeGerichte, fuegeZusammen, korbEintraege, korbSumme, leseUnterwegsDatei, pruefeGericht, restaurants, setzeGericht } from '../logik/unterwegs.js';
import { formatKurz } from '../logik/datum.js';
import { SLOTS } from '../logik/ziele.js';
import { tippGefuehl } from '../plattform.js';
import * as speicher from '../speicher.js';
import { el, gramm, hinweis, icon, zahl } from '../ui.js';
import { schnellFormular } from './schnellformular.js';

// Bleibt beim Öffnen und Schließen erhalten: zuletzt gewähltes Restaurant
let gewaehlt = null;

const ladeGerichte = async () => bereinigeGerichte(await speicher.einstellung('unterwegs'));
const sichere = (gerichte) => speicher.setzeEinstellung('unterwegs', gerichte);
const kurzWerte = (g) => [`${zahl(g.kcal)} kcal`, typeof g.protein === 'number' ? `E ${gramm(g.protein)} g` : null].filter(Boolean).join(' · ');

/**
 * Zeigt den Rechner im Blatt b (Steuerung aus blatt()). Die Bestellung (korb) überlebt Wechsel des
 * Restaurants und das Anlegen eines Gerichts, nicht aber das Schließen des Blatts.
 */
export async function zeigeUnterwegs({ b, datum, slot, beiFertig, korb = new Map() }) {
  const gerichte = await ladeGerichte();
  const namen = restaurants(gerichte);
  if (!namen.includes(gewaehlt)) gewaehlt = namen[0] ?? null;
  const neuZeigen = () => zeigeUnterwegs({ b, datum, slot, beiFertig, korb });

  const bearbeiten = (gericht = null) => b.setze(gericht ? gericht.name : 'Gericht anlegen', schnellFormular({
    werte: gericht ? { restaurant: gericht.restaurant, name: gericht.name, ...Object.fromEntries(['kcal', 'protein', 'kh', 'fett'].map((w) => [w, typeof gericht[w] === 'number' ? String(gericht[w]).replace('.', ',') : ''])) }
      : { restaurant: gewaehlt ?? '' },
    restaurants: namen, nameText: 'Gericht', namePlatzhalter: 'z. B. Burger, Pommes M, Cola 0,5 l', pruefe: pruefeGericht,
    speichernText: gericht ? 'Speichern' : 'Anlegen',
    beiSpeichern: async ({ gericht: neu }) => {
      await sichere(setzeGericht(await ladeGerichte(), neu, gericht?.id));
      if (gericht && gericht.id !== neu.id && korb.has(gericht.id)) { korb.set(neu.id, korb.get(gericht.id)); korb.delete(gericht.id); }
      gewaehlt = neu.restaurant;
      neuZeigen();
    },
    beiLoeschen: gericht ? async () => {
      await sichere((await ladeGerichte()).filter((g) => g.id !== gericht.id));
      korb.delete(gericht.id);
      hinweis(`${gericht.name} entfernt.`, { aktion: 'Rückgängig', beiAktion: async () => { await sichere(setzeGericht(await ladeGerichte(), gericht)); neuZeigen(); } });
      neuZeigen();
    } : null,
  }));

  const dateiWahl = el('input', {
    type: 'file', accept: 'application/json,.json', class: 'unsichtbar', id: 'f-unterwegs-datei',
    onchange: async (e) => {
      const datei = e.target.files?.[0];
      e.target.value = '';
      if (!datei) return;
      const r = leseUnterwegsDatei(await datei.text());
      if (!r.ok) { hinweis(r.fehler); return; }
      await sichere(fuegeZusammen(await ladeGerichte(), r.gerichte));
      const anzahlR = restaurants(r.gerichte).length;
      hinweis(`${r.gerichte.length} Gerichte von ${anzahlR} ${anzahlR === 1 ? 'Restaurant' : 'Restaurants'} geladen${r.stand ? `, Stand ${formatKurz(r.stand)}` : ''}${r.verworfen ? `; ${r.verworfen} ohne brauchbare Werte übersprungen` : ''}.`);
      neuZeigen();
    },
  });
  const verwalten = el('div', { class: 'unterwegs-links' },
    el('button', { type: 'button', class: 'textlink', id: 'gericht-neu', onclick: () => bearbeiten() }, 'Gericht anlegen'),
    el('button', { type: 'button', class: 'textlink', onclick: () => dateiWahl.click() }, 'Liste aus Datei laden'),
    dateiWahl);

  if (!gerichte.length) {
    b.setze('Unterwegs', el('div', { class: 'stapel unterwegs' },
      el('p', { class: 'leer' }, 'Leg einmal an, was du unterwegs öfter isst, mit den Werten aus der Nährwerttabelle des Restaurants (meist auf der Webseite oder in der App). Danach tippst du dir die Bestellung mit Plus und Minus zusammen.'),
      verwalten));
    return;
  }

  // Summe und Knopf ändern sich an Ort und Stelle, die Liste wird beim Zählen nicht neu gebaut
  const summeText = el('p', { class: 'unterwegs-summe', 'aria-live': 'polite', id: 'unterwegs-summe' });
  const eintragen = el('button', { type: 'submit', class: 'knopf', id: 'unterwegs-eintragen' }, 'Eintragen');
  const zeigeSumme = () => {
    const s = korbSumme(gerichte, korb);
    summeText.replaceChildren(s.anzahl
      ? el('strong', {}, `${zahl(s.kcal)} kcal`)
      : 'Tippe auf Plus, um etwas dazuzunehmen.',
    // Makros nur, wenn welche eingetragen sind: „F 0 g“ sähe sonst wie ein echter Wert aus
    s.anzahl ? [` · ${s.anzahl} ${s.anzahl === 1 ? 'Gericht' : 'Gerichte'}`, ...[['E', s.protein], ['K', s.kh], ['F', s.fett]].filter(([, w]) => w > 0).map(([k, w]) => `${k} ${gramm(w)} g`)].join(' · ') : '');
    eintragen.disabled = s.anzahl === 0;
  };
  const zeile = (g) => {
    const anzahl = el('span', { class: 'zaehler-wert', 'aria-live': 'polite' }, String(korb.get(g.id) ?? 0));
    const minus = el('button', { type: 'button', class: 'rund', 'aria-label': `${g.name} weniger` }, icon('minus', 18));
    const aendere = (schritt) => {
      const n = Math.max(0, Math.min(20, (korb.get(g.id) ?? 0) + schritt));
      if (n) korb.set(g.id, n); else korb.delete(g.id);
      anzahl.textContent = String(n);
      minus.disabled = n === 0;
      li.classList.toggle('gewaehlt', n > 0);
      if (schritt > 0) tippGefuehl();
      zeigeSumme();
    };
    minus.onclick = () => aendere(-1);
    minus.disabled = !korb.get(g.id);
    const li = el('li', { class: korb.get(g.id) ? 'unterwegs-zeile gewaehlt' : 'unterwegs-zeile' },
      el('button', { type: 'button', class: 'unterwegs-name', 'aria-label': `${g.name} bearbeiten`, onclick: () => bearbeiten(g) },
        el('span', {}, g.name), el('small', {}, kurzWerte(g))),
      el('span', { class: 'zaehler' }, minus, anzahl,
        el('button', { type: 'button', class: 'rund plus', 'aria-label': `${g.name} dazu`, onclick: () => aendere(1) }, icon('plus', 18))));
    return li;
  };
  const liste = el('ul', { class: 'zeilen unterwegs-liste' });
  const zeigeListe = () => liste.replaceChildren(...gerichte.filter((g) => g.restaurant === gewaehlt).map(zeile));
  const wahl = el('div', { class: 'chips unterwegs-restaurants', role: 'group', 'aria-label': 'Restaurant' }, namen.map((n) => el('button', {
    type: 'button', class: 'chip', 'aria-pressed': String(n === gewaehlt),
    onclick: (e) => {
      gewaehlt = n;
      for (const k of wahl.children) k.setAttribute('aria-pressed', String(k === e.currentTarget));
      zeigeListe();
    },
  }, n)));
  const slotWahl = el('select', { id: 'f-unterwegs-slot', 'aria-label': 'Mahlzeit' }, SLOTS.map((s) => el('option', { value: s.id, selected: s.id === slot }, s.name)));
  zeigeListe();
  zeigeSumme();

  b.setze('Unterwegs', el('form', {
    class: 'stapel unterwegs', novalidate: true,
    onsubmit: async (e) => {
      e.preventDefault();
      const neu = korbEintraege(gerichte, korb, datum, slotWahl.value);
      if (!neu.length) return;
      const gespeichert = [];
      for (const eintrag of neu) gespeichert.push(await speicher.speichereEintrag(eintrag));
      const s = korbSumme(gerichte, korb);
      tippGefuehl('erfolg');
      b.schliessen();
      beiFertig();
      hinweis(`${s.anzahl} ${s.anzahl === 1 ? 'Gericht' : 'Gerichte'}, ${zahl(s.kcal)} kcal eingetragen.`, {
        aktion: 'Rückgängig', beiAktion: async () => { for (const x of gespeichert) await speicher.loescheEintrag(x.id); beiFertig(); },
      });
    },
  },
  wahl,
  liste,
  verwalten,
  el('div', { class: 'unterwegs-fuss' }, summeText, el('div', { class: 'unterwegs-aktion' }, slotWahl, eintragen))));
}
