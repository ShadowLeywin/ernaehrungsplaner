// Blätter rund ums Eintragen: Zutat oder Rezept suchen, Menge eingeben, Eintrag ändern oder löschen.

import { isoDatum } from '../logik/datum.js';
import { fuerMenge } from '../logik/naehrwerte.js';
import { rezeptAlsZutat } from '../logik/rezepte.js';
import { schnellAlsText, schnellEintrag } from '../logik/schnell.js';
import { letzteMengen, sucheZutaten, zuletztVerwendet } from '../logik/suche.js';
import { magHinweis, sortiereNachVorliebe } from '../logik/vorlieben.js';
import { bereinigeVorlagen, fuerPlanGeeignet, pruefeVorlagenName, vorlageAus, vorlageEintraege, vorlageText } from '../logik/vorlagen.js';
import { SLOTS, slotFuerUhrzeit } from '../logik/ziele.js';
import { pruefeMenge } from '../logik/zutat.js';
import { tippGefuehl } from '../plattform.js';
import { gehe } from '../router.js';
import * as speicher from '../speicher.js';
import { blatt, el, gramm, hinweis, icon, zahl } from '../ui.js';
import { schnellFormular } from './schnellformular.js';
import { zeigeUnterwegs } from './unterwegs.js';

const slotName = (id) => SLOTS.find((s) => s.id === id)?.name ?? '';

/** Suchfeld mit Trefferliste. beiWahl bekommt die angetippte Zutat (oder das als Zutat verpackte Rezept). */
function suchListe({ auswahl, zuletzt = [], vorlieben = new Map(), mengen = new Map(), beiWahl, beiNeu, beiSchnell = null, beiNurKcal = null, beiUnterwegs = null, vorlagen = [], beiVorlage = null, beiVorlageLoeschen = null }) {
  const liste = el('div', { class: 'wahl-liste' });
  let aktuell = '';
  // Meine Mahlzeiten: ein Tipp trägt alle Teile ein; beim Suchen nur die, deren Name passt
  const vorlagenTeil = (begriff) => {
    const passend = vorlagen.filter((v) => !begriff.trim() || v.name.toLocaleLowerCase('de').includes(begriff.trim().toLocaleLowerCase('de')));
    if (!beiVorlage || !passend.length) return '';
    return [el('h3', { class: 'zwischentitel' }, 'Meine Mahlzeiten'), el('ul', { class: 'zeilen vorlagen' }, passend.map((v) => el('li', { class: 'zeile-schnell' },
      el('button', { type: 'button', class: 'zeile', 'aria-label': `${v.name} eintragen`, onclick: () => beiVorlage(v) },
        el('span', { class: 'zeile-name' }, v.name, el('small', {}, vorlageText(v))),
        el('span', { class: 'zeile-wert vorlage-plus' }, icon('plus', 18))),
      beiVorlageLoeschen ? el('button', {
        type: 'button', class: 'rund', 'aria-label': `${v.name} vergessen`,
        onclick: async () => { await beiVorlageLoeschen(v); vorlagen = vorlagen.filter((x) => x.id !== v.id); zeichne(aktuell); },
      }, icon('zu', 18)) : null)))];
  };
  const klein = (zutat) => {
    const text = zutat.istRezept ? 'Rezept' : (magHinweis(vorlieben.get(zutat.id)) || zutat.marke);
    return text ? el('small', {}, text) : null;
  };
  const zeile = (zutat) => el('li', {}, el('button', { type: 'button', class: 'zeile', onclick: () => beiWahl(zutat) },
    el('span', { class: 'zeile-name' }, zutat.name, klein(zutat)),
    el('span', { class: 'zeile-wert' }, `${zahl(zutat.je100.kcal ?? 0)} kcal`)));
  const zeichne = (begriff) => {
    aktuell = begriff;
    const treffer = sortiereNachVorliebe(sucheZutaten(auswahl, begriff, 40), vorlieben);
    const zeigeZuletzt = !begriff.trim() && zuletzt.length > 0;
    const vorlagenStuecke = [vorlagenTeil(begriff)].flat().filter(Boolean);
    liste.replaceChildren(
      ...vorlagenStuecke,
      zeigeZuletzt ? el('h3', { class: 'zwischentitel' }, 'Zuletzt eingetragen') : '',
      zeigeZuletzt ? el('ul', { class: 'zeilen' }, zuletzt.map((zutat) => (beiSchnell && mengen.has(zutat.id)
        ? el('li', { class: 'zeile-schnell' },
          zeile(zutat).firstChild,
          el('button', {
            type: 'button', class: 'chip schnell', 'aria-label': `${zutat.name}: ${zahl(mengen.get(zutat.id), 1)} g sofort eintragen`,
            onclick: () => beiSchnell(zutat, mengen.get(zutat.id)),
          }, `+ ${zahl(mengen.get(zutat.id), 1)} g`))
        : zeile(zutat)))) : '',
      zeigeZuletzt || vorlagenStuecke.length ? el('h3', { class: 'zwischentitel' }, 'Alles') : '',
      treffer.length ? el('ul', { class: 'zeilen' }, treffer.map(zeile)) : el('p', { class: 'leer' }, `Nichts passt zu „${begriff.trim()}“.`),
      // Mensa, Restaurant, Snack bei Freunden: ohne Datenbank, nur mit Kalorien. Der Suchbegriff wird zum Namen
      beiNurKcal ? el('button', { type: 'button', class: 'chip schnell nur-kcal', id: 'nur-kcal', onclick: () => beiNurKcal(begriff.trim()) },
        begriff.trim() ? `„${begriff.trim()}“ mit Kalorien eintragen` : 'Nur Kalorien eintragen') : '',
      el('button', { type: 'button', class: 'textlink', onclick: beiNeu }, 'Nicht dabei? Neue Zutat anlegen'),
    );
  };
  zeichne('');
  return el('div', { class: 'stapel' },
    // Abkürzung für Restaurant und Imbiss: Bestellung aus gemerkten Gerichten zusammentippen
    beiUnterwegs ? el('button', { type: 'button', class: 'schnellweg', id: 'unterwegs-oeffnen', onclick: beiUnterwegs },
      el('span', { class: 'schnellweg-bild', 'aria-hidden': 'true' }, icon('unterwegs', 22)),
      el('span', { class: 'schnellweg-text' }, 'Unterwegs', el('small', {}, 'Restaurant, Imbiss, Fast Food')),
      icon('vor', 18)) : null,
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
  const [zutaten, rezepte, alleEintraege, vorlieben, vorlagenRoh] = await Promise.all([speicher.alleZutaten(), speicher.alleRezepte(), speicher.alleEintraege(), speicher.alleVorlieben(), speicher.einstellung('vorlagen')]);
  const vorlagen = bereinigeVorlagen(vorlagenRoh).filter((v) => !plan || fuerPlanGeeignet(v));
  const auswahl = [...rezepte.map(rezeptAlsZutat).filter((r) => r.portionen.length), ...zutaten];
  const nachId = new Map(auswahl.map((z) => [z.id, z]));
  const zuletzt = zuletztVerwendet(alleEintraege).map((id) => nachId.get(id)).filter(Boolean);

  blatt({
    titel: plan ? 'Einplanen' : slotName(slot),
    inhalt: (b) => suchListe({
      auswahl,
      zuletzt,
      vorlieben,
      mengen: letzteMengen(alleEintraege),
      beiNeu: () => { b.schliessen(); gehe('/zutaten/neu'); },
      vorlagen,
      beiVorlage: async (vorlage) => {
        const speichere = plan ? speicher.speicherePlan : speicher.speichereEintrag;
        const gespeichert = [];
        for (const e of vorlageEintraege(vorlage, datum, slot)) gespeichert.push(await speichere(e));
        tippGefuehl('erfolg');
        b.schliessen();
        beiFertig();
        hinweis(`${vorlage.name} ${plan ? 'eingeplant' : 'eingetragen'}.`, {
          aktion: 'Rückgängig', beiAktion: async () => { for (const x of gespeichert) await (plan ? speicher.loeschePlan : speicher.loescheEintrag)(x.id); beiFertig(); },
        });
      },
      beiVorlageLoeschen: async (vorlage) => {
        const alle = bereinigeVorlagen(await speicher.einstellung('vorlagen'));
        await speicher.setzeEinstellung('vorlagen', alle.filter((v) => v.id !== vorlage.id));
        hinweis(`„${vorlage.name}“ vergessen.`, { aktion: 'Rückgängig', beiAktion: async () => { await speicher.setzeEinstellung('vorlagen', bereinigeVorlagen([vorlage, ...bereinigeVorlagen(await speicher.einstellung('vorlagen'))])); } });
      },
      // Im Plan nicht: Ein Posten ohne Zutat hätte keinen Platz auf der Einkaufsliste
      beiUnterwegs: plan ? null : () => zeigeUnterwegs({ b, datum, slot, beiFertig }),
      beiNurKcal: plan ? null : (begriff) => b.setze('Schnell eintragen', schnellFormular({
        werte: { name: begriff }, slot, speichernText: 'Eintragen',
        beiSpeichern: async (daten, wahlSlot) => {
          const gespeichert = await speicher.speichereEintrag(schnellEintrag(daten, datum, wahlSlot));
          tippGefuehl('erfolg');
          b.schliessen();
          beiFertig();
          hinweis(`${daten.name}, ${zahl(daten.je100.kcal)} kcal eingetragen.`, {
            aktion: 'Rückgängig', beiAktion: async () => { await speicher.loescheEintrag(gespeichert.id); beiFertig(); },
          });
        },
      })),
      // Ein Tipp: dieselbe Menge wie beim letzten Mal, mit Rückgängig statt Rückfrage
      beiSchnell: async (zutat, menge) => {
        const gespeichert = await (plan ? speicher.speicherePlan : speicher.speichereEintrag)(neuerEintrag(zutat, datum, { gramm: menge, slot }));
        tippGefuehl('erfolg');
        b.schliessen();
        beiFertig();
        hinweis(`${zutat.name}, ${zahl(menge, 1)} g ${plan ? 'eingeplant' : 'eingetragen'}.`, {
          aktion: 'Rückgängig',
          beiAktion: async () => { await (plan ? speicher.loeschePlan : speicher.loescheEintrag)(gespeichert.id); beiFertig(); },
        });
      },
      beiWahl: (zutat) => b.setze(zutat.name, mengenFormular({
        name: zutat.name, je100: zutat.je100, portionen: zutat.portionen, slot, speichernText: plan ? 'Einplanen' : 'Eintragen',
        gramm: zutat.istRezept ? zutat.portionen[0].gramm : undefined,
        beiSpeichern: async (wahl) => {
          await (plan ? speicher.speicherePlan : speicher.speichereEintrag)(neuerEintrag(zutat, datum, wahl));
          tippGefuehl('erfolg');
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

/** Eine Mahlzeit als Vorlage merken (aus „Heute“): Name vorschlagen, Teile zeigen, speichern. */
export function merkeAlsVorlage({ eintraege, slotName: name }) {
  const fehler = el('p', { class: 'fehlertext', id: 'f-vorlage-name-fehler', role: 'alert' });
  const feldName = el('input', { id: 'f-vorlage-name', maxlength: 40, autocomplete: 'off', value: `Mein ${name}`, 'aria-describedby': 'f-vorlage-name-fehler', oninput: () => { fehler.textContent = ''; } });
  const b = blatt({
    titel: 'Als Mahlzeit merken',
    inhalt: el('form', {
      class: 'stapel', novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault();
        const vorlagen = bereinigeVorlagen(await speicher.einstellung('vorlagen'));
        const name = pruefeVorlagenName(feldName.value, vorlagen);
        if (!name.ok) { fehler.textContent = name.fehler; feldName.focus(); return; }
        const neu = vorlageAus(eintraege, name.name, crypto.randomUUID());
        await speicher.setzeEinstellung('vorlagen', bereinigeVorlagen([neu, ...vorlagen]));
        tippGefuehl('erfolg');
        b.schliessen();
        hinweis(`„${name.name}“ gemerkt. Du findest sie beim Plus unter „Meine Mahlzeiten“.`);
      },
    },
    el('div', { class: 'feld' }, el('label', { for: 'f-vorlage-name' }, 'Name'), el('div', { class: 'eingabe' }, feldName), fehler),
    el('ul', { class: 'zeilen vorlage-vorschau' }, eintraege.map((e) => el('li', { class: 'zeile' },
      el('span', { class: 'zeile-name' }, e.name), el('span', { class: 'zeile-wert' }, e.schnell ? 'Portion' : `${zahl(e.gramm, 1)} g`)))),
    el('div', { class: 'knopfreihe' }, el('button', { type: 'submit', class: 'knopf' }, 'Merken'))),
  });
  queueMicrotask(() => feldName.select());
}

/** Rezept-Formular: nur eine Zutat auswählen, die Menge fragt das Formular selbst ab. */
export async function waehleZutat({ beiWahl }) {
  const [zutaten, vorlieben] = await Promise.all([speicher.alleZutaten(), speicher.alleVorlieben()]);
  blatt({
    titel: 'Zutat hinzufügen',
    inhalt: (b) => suchListe({
      auswahl: zutaten,
      vorlieben,
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
        tippGefuehl('erfolg');
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
  let b = null; // das Blatt; „Löschen“ braucht es, egal welches Formular es zeigt
  const loeschen = async () => {
    await loesche(eintrag.id);
    b.schliessen();
    beiFertig();
    hinweis(plan ? 'Aus dem Plan entfernt.' : 'Eintrag gelöscht.', { aktion: 'Rückgängig', beiAktion: async () => { await speichere(eintrag); beiFertig(); } });
  };
  if (eintrag.schnell) {
    b = blatt({
      titel: eintrag.name,
      inhalt: schnellFormular({
        werte: schnellAlsText(eintrag), slot: eintrag.slot, speichernText: 'Speichern', beiLoeschen: () => loeschen(),
        beiSpeichern: async ({ name, je100 }, slot) => {
          await speichere({ ...eintrag, name, je100, slot });
          b.schliessen();
          hinweis('Gespeichert.');
          beiFertig();
        },
      }),
    });
    return;
  }
  const zutat = eintrag.zutatId ? await speicher.holeZutat(eintrag.zutatId).catch(() => null) : null;
  b = blatt({
    titel: eintrag.name,
    inhalt: mengenFormular({
      name: eintrag.name, je100: eintrag.je100, portionen: zutat?.portionen, slot: eintrag.slot, gramm: eintrag.gramm, speichernText: 'Speichern',
      beiSpeichern: async ({ gramm: menge, slot }) => {
        await speichere({ ...eintrag, gramm: menge, slot });
        b.schliessen();
        hinweis('Gespeichert.');
        beiFertig();
      },
      beiLoeschen: loeschen,
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
