// Blätter für das Tagebuch: Zutat wählen, Menge eingeben, Eintrag ändern oder löschen.

import { fuerMenge } from '../logik/naehrwerte.js';
import { sucheZutaten, zuletztVerwendet } from '../logik/suche.js';
import { SLOTS } from '../logik/ziele.js';
import { pruefeMenge } from '../logik/zutat.js';
import { gehe } from '../router.js';
import * as speicher from '../speicher.js';
import { blatt, el, gramm, hinweis, zahl } from '../ui.js';

const slotName = (id) => SLOTS.find((s) => s.id === id)?.name ?? '';

/** Schritt 1: Zutat suchen und antippen. Danach folgt im selben Blatt die Menge. */
export async function oeffneZutatWahl({ datum, slot, beiFertig }) {
  const [zutaten, alleEintraege] = await Promise.all([speicher.alleZutaten(), speicher.alleEintraege()]);
  const nachId = new Map(zutaten.map((z) => [z.id, z]));
  const zuletzt = zuletztVerwendet(alleEintraege).map((id) => nachId.get(id)).filter(Boolean);

  blatt({
    titel: slotName(slot),
    inhalt: (b) => {
      const liste = el('div', { class: 'wahl-liste' });
      const waehle = (zutat) => b.setze(zutat.name, mengenFormular({
        name: zutat.name, je100: zutat.je100, portionen: zutat.portionen, slot, speichernText: 'Eintragen',
        beiSpeichern: async ({ gramm: menge, slot: ziel }) => {
          await speicher.speichereEintrag({ datum, slot: ziel, zutatId: zutat.id, name: zutat.name, marke: zutat.marke ?? '', gramm: menge, je100: zutat.je100 });
          b.schliessen();
          hinweis('Eingetragen.');
          beiFertig();
        },
      }));
      const zeile = (zutat) => el('li', {}, el('button', { type: 'button', class: 'zeile', onclick: () => waehle(zutat) },
        el('span', { class: 'zeile-name' }, zutat.name, zutat.marke ? el('small', {}, zutat.marke) : null),
        el('span', { class: 'zeile-wert' }, `${zahl(zutat.je100.kcal)} kcal`)));
      const zeichne = (begriff) => {
        const treffer = sucheZutaten(zutaten, begriff, 40);
        const zeigeZuletzt = !begriff.trim() && zuletzt.length > 0;
        liste.replaceChildren(
          zeigeZuletzt ? el('h3', { class: 'zwischentitel' }, 'Zuletzt eingetragen') : '',
          zeigeZuletzt ? el('ul', { class: 'zeilen' }, zuletzt.map(zeile)) : '',
          zeigeZuletzt ? el('h3', { class: 'zwischentitel' }, 'Alle Zutaten') : '',
          treffer.length
            ? el('ul', { class: 'zeilen' }, treffer.map(zeile))
            : el('p', { class: 'leer' }, `Keine Zutat passt zu „${begriff.trim()}“.`),
          el('button', { type: 'button', class: 'textlink', onclick: () => { b.schliessen(); gehe('/zutaten/neu'); } }, 'Nicht dabei? Neue Zutat anlegen'),
        );
      };
      zeichne('');
      return el('div', { class: 'stapel' },
        el('input', {
          type: 'search', class: 'suchfeld', placeholder: 'Zutat suchen', 'aria-label': 'Zutat suchen', autocomplete: 'off',
          enterkeyhint: 'search', oninput: (e) => zeichne(e.target.value),
        }),
        el('p', { class: 'klein' }, 'Werte je 100 g'),
        liste);
    },
  });
}

/** Bestehenden Eintrag ändern oder löschen */
export async function oeffneEintrag({ eintrag, beiFertig }) {
  const zutat = await speicher.holeZutat(eintrag.zutatId).catch(() => null);
  const b = blatt({
    titel: eintrag.name,
    inhalt: mengenFormular({
      name: eintrag.name, je100: eintrag.je100, portionen: zutat?.portionen, slot: eintrag.slot, gramm: eintrag.gramm, speichernText: 'Speichern',
      beiSpeichern: async ({ gramm: menge, slot }) => {
        await speicher.speichereEintrag({ ...eintrag, gramm: menge, slot });
        b.schliessen();
        hinweis('Gespeichert.');
        beiFertig();
      },
      beiLoeschen: async () => {
        await speicher.loescheEintrag(eintrag.id);
        b.schliessen();
        beiFertig();
        hinweis('Eintrag gelöscht.', { aktion: 'Rückgängig', beiAktion: async () => { await speicher.speichereEintrag(eintrag); beiFertig(); } });
      },
    }),
  });
}

/** Formular für Menge und Slot, mit Vorschau der Nährwerte */
function mengenFormular({ name, je100, portionen = [], slot, gramm: start, speichernText, beiSpeichern, beiLoeschen }) {
  const fehler = el('p', { class: 'fehlertext', role: 'alert' });
  const vorschau = el('dl', { class: 'vorschau' });
  const eingabe = el('input', {
    id: 'f-gramm', name: 'gramm', inputmode: 'decimal', autocomplete: 'off', enterkeyhint: 'done',
    value: start ? String(start).replace('.', ',') : '', 'aria-describedby': 'f-gramm-fehler',
  });
  fehler.id = 'f-gramm-fehler';
  const slotWahl = el('select', { id: 'f-slot', name: 'slot' }, SLOTS.map((s) => el('option', { value: s.id, selected: s.id === slot }, s.name)));

  const zeigeVorschau = () => {
    const pruefung = pruefeMenge(eingabe.value);
    const werte = fuerMenge(je100, pruefung.ok ? pruefung.gramm : 0);
    const paar = (titel, wert) => el('div', {}, el('dt', {}, titel), el('dd', {}, wert));
    vorschau.replaceChildren(
      paar('Energie', `${zahl(werte.kcal ?? 0)} kcal`),
      paar('Eiweiß', `${gramm(werte.protein ?? 0)} g`),
      paar('Kohlenhydrate', `${gramm(werte.kh ?? 0)} g`),
      paar('Fett', `${gramm(werte.fett ?? 0)} g`));
  };
  const setze = (menge) => { eingabe.value = String(menge).replace('.', ','); fehler.textContent = ''; zeigeVorschau(); eingabe.focus(); };
  eingabe.addEventListener('input', () => { fehler.textContent = ''; zeigeVorschau(); });
  zeigeVorschau();

  const vorschlaege = [...portionen.map((p) => ({ text: `1 ${p.name} (${zahl(p.gramm)} g)`, gramm: p.gramm })), { text: '100 g', gramm: 100 }];

  const formular = el('form', {
    class: 'stapel', novalidate: true, 'aria-label': `Menge für ${name}`,
    onsubmit: async (e) => {
      e.preventDefault();
      const pruefung = pruefeMenge(eingabe.value);
      if (!pruefung.ok) { fehler.textContent = pruefung.fehler; eingabe.focus(); return; }
      await beiSpeichern({ gramm: pruefung.gramm, slot: slotWahl.value });
    },
  },
  el('div', { class: 'feld' },
    el('label', { for: 'f-gramm' }, 'Menge'),
    el('div', { class: 'eingabe' }, eingabe, el('span', { class: 'einheit' }, 'g')),
    fehler),
  el('div', { class: 'chips' }, vorschlaege.map((v) => el('button', { type: 'button', class: 'chip', onclick: () => setze(v.gramm) }, v.text))),
  vorschau,
  el('div', { class: 'feld' }, el('label', { for: 'f-slot' }, 'Mahlzeit'), slotWahl),
  el('div', { class: 'knopfreihe' },
    beiLoeschen ? el('button', { type: 'button', class: 'knopf leise', onclick: beiLoeschen }, 'Löschen') : null,
    el('button', { type: 'submit', class: 'knopf' }, speichernText)));

  // Erst fokussieren, wenn das Formular im Dokument hängt
  queueMicrotask(() => eingabe.focus());
  return formular;
}
