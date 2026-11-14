// Blätter rund ums Eintragen: Zutat oder Rezept suchen, Menge eingeben, Eintrag ändern oder löschen.

import { isoDatum } from '../logik/datum.js';
import { fuerMenge } from '../logik/naehrwerte.js';
import { rezeptAlsZutat } from '../logik/rezepte.js';
import { sucheZutaten, zuletztVerwendet } from '../logik/suche.js';
import { SLOTS, slotFuerUhrzeit } from '../logik/ziele.js';
import { pruefeMenge } from '../logik/zutat.js';
import { gehe } from '../router.js';
import * as speicher from '../speicher.js';
import { blatt, el, gramm, hinweis, zahl } from '../ui.js';

const slotName = (id) => SLOTS.find((s) => s.id === id)?.name ?? '';

/** Suchfeld mit Trefferliste. beiWahl bekommt die angetippte Zutat (oder das als Zutat verpackte Rezept). */
function suchListe({ auswahl, zuletzt = [], beiWahl, beiNeu }) {
  const liste = el('div', { class: 'wahl-liste' });
  const zeile = (zutat) => el('li', {}, el('button', { type: 'button', class: 'zeile', onclick: () => beiWahl(zutat) },
    el('span', { class: 'zeile-name' }, zutat.name, zutat.istRezept ? el('small', {}, 'Rezept') : (zutat.marke ? el('small', {}, zutat.marke) : null)),
    el('span', { class: 'zeile-wert' }, `${zahl(zutat.je100.kcal ?? 0)} kcal`)));
  const zeichne = (begriff) => {
    const treffer = sucheZutaten(auswahl, begriff, 40);
    const zeigeZuletzt = !begriff.trim() && zuletzt.length > 0;
    liste.replaceChildren(
      zeigeZuletzt ? el('h3', { class: 'zwischentitel' }, 'Zuletzt eingetragen') : '',
      zeigeZuletzt ? el('ul', { class: 'zeilen' }, zuletzt.map(zeile)) : '',
      zeigeZuletzt ? el('h3', { class: 'zwischentitel' }, 'Alles') : '',
      treffer.length ? el('ul', { class: 'zeilen' }, treffer.map(zeile)) : el('p', { class: 'leer' }, `Nichts passt zu „${begriff.trim()}“.`),
      el('button', { type: 'button', class: 'textlink', onclick: beiNeu }, 'Nicht dabei? Neue Zutat anlegen'),
    );
  };
  zeichne('');
  return el('div', { class: 'stapel' },
    el('input', {
      type: 'search', class: 'suchfeld', placeholder: 'Suchen', 'aria-label': 'Zutat oder Rezept suchen', autocomplete: 'off',
      enterkeyhint: 'search', oninput: (e) => zeichne(e.target.value),
    }),
    el('p', { class: 'klein' }, 'Werte je 100 g'),
    liste);
}

/**
 * Erst suchen und antippen, dann im selben Blatt die Menge.
 * ziel: 'tagebuch' trägt ein, 'plan' merkt für den Wochenplan vor.
 */
export async function oeffneZutatWahl({ datum, slot, beiFertig, ziel = 'tagebuch' }) {
  const plan = ziel === 'plan';
  const [zutaten, rezepte, alleEintraege] = await Promise.all([speicher.alleZutaten(), speicher.alleRezepte(), speicher.alleEintraege()]);
  const auswahl = [...rezepte.map(rezeptAlsZutat).filter((r) => r.portionen.length), ...zutaten];
  const nachId = new Map(auswahl.map((z) => [z.id, z]));
  const zuletzt = zuletztVerwendet(alleEintraege).map((id) => nachId.get(id)).filter(Boolean);

  blatt({
    titel: plan ? 'Einplanen' : slotName(slot),
    inhalt: (b) => suchListe({
      auswahl,
      zuletzt,
      beiNeu: () => { b.schliessen(); gehe('/zutaten/neu'); },
      beiWahl: (zutat) => b.setze(zutat.name, mengenFormular({
        name: zutat.name, je100: zutat.je100, portionen: zutat.portionen, slot, speichernText: plan ? 'Einplanen' : 'Eintragen',
        gramm: zutat.istRezept ? zutat.portionen[0].gramm : undefined,
        beiSpeichern: async (wahl) => {
          await (plan ? speicher.speicherePlan : speicher.speichereEintrag)(neuerEintrag(zutat, datum, wahl));
          b.schliessen();
          hinweis(plan ? 'Eingeplant.' : 'Eingetragen.');
          beiFertig();
        },
      })),
    }),
  });
}

function neuerEintrag(zutat, datum, { gramm: menge, slot }) {
  const eintrag = { datum, slot, zutatId: zutat.id, name: zutat.name, marke: zutat.marke ?? '', gramm: menge, je100: zutat.je100 };
  if (zutat.istRezept) eintrag.rezeptId = zutat.id.slice(7);
  return eintrag;
}

/** Rezept-Formular: nur eine Zutat auswählen, die Menge fragt das Formular selbst ab. */
export async function waehleZutat({ beiWahl }) {
  const zutaten = await speicher.alleZutaten();
  blatt({
    titel: 'Zutat hinzufügen',
    inhalt: (b) => suchListe({
      auswahl: zutaten,
      beiNeu: () => { b.schliessen(); gehe('/zutaten/neu'); },
      beiWahl: (zutat) => { b.schliessen(); beiWahl(zutat); },
    }),
  });
}

/** Aus der Rezeptseite: eine Portion für heute eintragen. */
export function oeffneRezeptPortion({ rezept, beiFertig }) {
  const zutat = rezeptAlsZutat(rezept);
  const b = blatt({
    titel: rezept.name,
    inhalt: mengenFormular({
      name: rezept.name, je100: zutat.je100, portionen: zutat.portionen, gramm: zutat.portionen[0]?.gramm,
      slot: slotFuerUhrzeit(new Date().getHours()), speichernText: 'Für heute eintragen',
      beiSpeichern: async (wahl) => {
        await speicher.speichereEintrag(neuerEintrag(zutat, isoDatum(), wahl));
        b.schliessen();
        hinweis(`Eingetragen bei ${slotName(wahl.slot)}.`, { aktion: 'Zum Tagebuch', beiAktion: () => gehe('/heute') });
        beiFertig?.();
      },
    }),
  });
}

/** Bestehenden Eintrag (oder Plan-Posten) ändern oder löschen */
export async function oeffneEintrag({ eintrag, beiFertig, ziel = 'tagebuch' }) {
  const plan = ziel === 'plan';
  const speichere = plan ? speicher.speicherePlan : speicher.speichereEintrag;
  const loesche = plan ? speicher.loeschePlan : speicher.loescheEintrag;
  const zutat = await speicher.holeZutat(eintrag.zutatId).catch(() => null);
  const b = blatt({
    titel: eintrag.name,
    inhalt: mengenFormular({
      name: eintrag.name, je100: eintrag.je100, portionen: zutat?.portionen, slot: eintrag.slot, gramm: eintrag.gramm, speichernText: 'Speichern',
      beiSpeichern: async ({ gramm: menge, slot }) => {
        await speichere({ ...eintrag, gramm: menge, slot });
        b.schliessen();
        hinweis('Gespeichert.');
        beiFertig();
      },
      beiLoeschen: async () => {
        await loesche(eintrag.id);
        b.schliessen();
        beiFertig();
        hinweis(plan ? 'Aus dem Plan entfernt.' : 'Eintrag gelöscht.', { aktion: 'Rückgängig', beiAktion: async () => { await speichere(eintrag); beiFertig(); } });
      },
    }),
  });
}

/** Formular für Menge und Slot, mit Vorschau der Nährwerte */
function mengenFormular({ name, je100, portionen = [], slot, gramm: start, speichernText, beiSpeichern, beiLoeschen }) {
  const fehler = el('p', { class: 'fehlertext', role: 'alert', id: 'f-gramm-fehler' });
  const vorschau = el('dl', { class: 'vorschau' });
  const eingabe = el('input', {
    id: 'f-gramm', name: 'gramm', inputmode: 'decimal', autocomplete: 'off', enterkeyhint: 'done',
    value: start ? String(start).replace('.', ',') : '', 'aria-describedby': 'f-gramm-fehler',
  });
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

  // Bei Rezepten sind halbe und doppelte Portionen üblich
  const vorschlaege = portionen.flatMap((p) => (p.name === 'Portion'
    ? [{ text: `½ Portion (${zahl(p.gramm / 2)} g)`, gramm: p.gramm / 2 }, { text: `1 Portion (${zahl(p.gramm)} g)`, gramm: p.gramm }, { text: `2 Portionen (${zahl(p.gramm * 2)} g)`, gramm: p.gramm * 2 }]
    : [{ text: `1 ${p.name} (${zahl(p.gramm)} g)`, gramm: p.gramm }]));
  vorschlaege.push({ text: '100 g', gramm: 100 });

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
