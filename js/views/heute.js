// Tagesansicht: Tagesziele mit Fortschritt, Wasser, Morning Stack, Supplements,
// Einträge pro Mahlzeit und Zähler (Tag / Wochendurchschnitt).
import { el, zahl, schalter } from '../ui.js';
import { holeProfil, holeTag, holeTage, speichereTag } from '../state.js';
import { holeLebensmittel } from '../lebensmittel.js';
import { tagestypFuerDatum, mahlzeitenZiele, datumSchluessel } from '../logic/ziele.js';
import { fixeNaehrwerte } from '../logic/fixeintraege.js';
import { wasserSumme, wasserBisUhrzeit, pruefeWassermenge } from '../logic/wasser.js';
import {
  eintragNaehrwerte, mahlzeitSumme, tagesNaehrwerte, gemueseObstGramm,
  wochenSchluessel, wochenDurchschnitt, neueEintragsId,
} from '../logic/tag.js';
import { oeffneEintragDialog } from './eintrag-dialog.js';
import { balkenZeile, zaehlerInhalt } from './zaehler.js';

const datumFormat = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
const uhrzeitFormat = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });

// Bleibt beim Wechsel zwischen Reitern erhalten; beim Neustart der App wieder heute
let angezeigtesDatum = null;
let zaehlerModus = 'tag';

export const heute = {
  titel: 'Heute',
  render() {
    const wurzel = el('div');
    lade(wurzel);
    return wurzel;
  },
};

function lade(wurzel) {
  const datum = angezeigtesDatum ?? new Date();
  Promise.all([holeProfil(), holeLebensmittel(), holeTag(datumSchluessel(datum))])
    .then(([profil, daten, tag]) => zeichne(wurzel, { profil, lebensmittel: daten.lebensmittel, tag, datum }))
    .catch((fehler) => wurzel.replaceChildren(el('p', { class: 'warnung' }, fehler.message)));
}

const makroText = (w) => `${zahl(Math.round(w.kcal ?? 0))} kcal · P ${zahl(Math.round(w.protein ?? 0))} · KH ${zahl(Math.round(w.kh ?? 0))} · F ${zahl(Math.round(w.fett ?? 0))}`;

function zeichne(wurzel, kontext) {
  const { profil, lebensmittel, tag, datum } = kontext;
  const { typ, notiz } = tagestypFuerDatum(profil, datum);
  const fix = fixeNaehrwerte(profil, lebensmittel);
  const ziele = mahlzeitenZiele(typ, profil.mahlzeiten, fix.gesamt);
  const ist = tagesNaehrwerte(tag, profil, lebensmittel);

  // Nach jeder Änderung speichern und neu zeichnen, damit alle Summen stimmen
  const aendern = async () => {
    await speichereTag(tag);
    zeichne(wurzel, kontext);
  };

  const zaehlerBereich = el('div');
  wurzel.replaceChildren(
    datumsLeiste(wurzel, datum),
    el('section', { class: 'karte' },
      el('h2', {}, typ.name, notiz ? el('span', { class: 'marke' }, notiz) : null),
      makroBalken('Kalorien', ist.kcal, typ.kcal, 'kcal'),
      makroBalken('Protein', ist.protein, typ.protein, 'g'),
      makroBalken('Kohlenhydrate', ist.kh, typ.kh, 'g'),
      makroBalken('Fett', ist.fett, typ.fett, 'g')),
    wasserKarte(profil, typ, tag, () => speichereTag(tag)),
    profil.morningStack.aktiv ? morningStackKarte(profil, lebensmittel, fix, tag, aendern) : null,
    supplementKarte(profil, tag, aendern),
    ...profil.mahlzeiten.map((m) => mahlzeitKarte(m, ziele.find((z) => z.id === m.id), tag, lebensmittel, aendern)),
    el('section', { class: 'karte' },
      el('div', { class: 'zeile' },
        el('h2', {}, 'Zähler'),
        el('div', { class: 'umschalter', role: 'group', 'aria-label': 'Zeitraum' },
          ...[['tag', 'Tag'], ['woche', 'Woche Ø']].map(([modus, text]) => el('button', {
            type: 'button',
            class: zaehlerModus === modus ? 'aktiv' : '',
            'aria-pressed': String(zaehlerModus === modus),
            onclick: () => { zaehlerModus = modus; zeichne(wurzel, kontext); },
          }, text)))),
      zaehlerBereich),
  );

  if (zaehlerModus === 'tag') {
    zaehlerBereich.replaceChildren(...zaehlerInhalt({
      werte: ist, gemueseObst: gemueseObstGramm(tag, lebensmittel), typ, referenzgruppe: profil.referenzgruppe,
    }));
  } else {
    zaehlerBereich.replaceChildren(el('p', { class: 'leise' }, 'Lade Woche …'));
    const schluessel = wochenSchluessel(datum);
    holeTage(schluessel).then((tage) => {
      // Den angezeigten Tag mit seinem aktuellen Stand verwenden
      const woche = tage.map((t) => (t.datum === tag.datum ? tag : t));
      const schnitt = wochenDurchschnitt(woche, profil, lebensmittel);
      zaehlerBereich.replaceChildren(
        el('p', { class: 'leise klein' },
          schnitt.tage
            ? `Durchschnitt pro Tag über ${schnitt.tage} Tag${schnitt.tage === 1 ? '' : 'e'} mit Einträgen (Mo–So). Ziele des Trainingstags als Vergleich.`
            : 'In dieser Woche gibt es noch keine Einträge.'),
        ...(schnitt.tage ? zaehlerInhalt({
          werte: schnitt.werte,
          gemueseObst: schnitt.gemueseObst,
          typ: profil.tagestypen.find((t) => t.basis) ?? typ,
          referenzgruppe: profil.referenzgruppe,
        }) : []));
    });
  }
}

function datumsLeiste(wurzel, datum) {
  const istHeute = datumSchluessel(datum) === datumSchluessel(new Date());
  const springe = (tage) => {
    angezeigtesDatum = new Date(datum.getFullYear(), datum.getMonth(), datum.getDate() + tage);
    if (datumSchluessel(angezeigtesDatum) === datumSchluessel(new Date())) angezeigtesDatum = null;
    lade(wurzel);
  };
  return el('div', { class: 'datumsleiste' },
    el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Vorheriger Tag', onclick: () => springe(-1) }, '‹'),
    el('div', {},
      el('strong', {}, istHeute ? 'Heute' : datumFormat.format(datum)),
      istHeute ? el('span', { class: 'leise klein' }, ` · ${datumFormat.format(datum)}`) : null),
    istHeute
      ? el('span', { class: 'knopf-klein' })
      : el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Nächster Tag', onclick: () => springe(1) }, '›'));
}

function makroBalken(name, ist, ziel, einheit) {
  const anteil = ziel > 0 ? ist / ziel : 0;
  const status = anteil > 1.1 ? 'zu_viel' : anteil >= 0.9 ? 'erreicht' : 'niedrig';
  return balkenZeile(name, ist ?? 0, ziel, einheit, status);
}

function mahlzeitKarte(mahlzeit, ziel, tag, lebensmittel, aendern) {
  const eintraege = tag.eintraege.filter((e) => e.mahlzeit === mahlzeit.id);
  const summe = mahlzeitSumme(tag, mahlzeit.id, lebensmittel);
  const name = (id) => lebensmittel.find((l) => l.id === id)?.name ?? `Unbekannt (${id})`;

  const bearbeiten = (eintrag) => oeffneEintragDialog({
    lebensmittel,
    titel: mahlzeit.name,
    eintrag,
    beiSpeichern: (lebensmittelId, gramm) => { Object.assign(eintrag, { lebensmittelId, gramm }); aendern(); },
    beiLoeschen: () => { tag.eintraege.splice(tag.eintraege.indexOf(eintrag), 1); aendern(); },
  });
  const hinzufuegen = () => oeffneEintragDialog({
    lebensmittel,
    titel: mahlzeit.name,
    beiSpeichern: (lebensmittelId, gramm) => {
      tag.eintraege.push({ id: neueEintragsId(), mahlzeit: mahlzeit.id, lebensmittelId, gramm, zeit: new Date().toISOString() });
      aendern();
    },
  });

  return el('section', { class: 'karte mahlzeit' },
    el('div', { class: 'zeile' },
      el('h2', {}, mahlzeit.name),
      el('span', { class: 'leise klein' }, `${zahl(Math.round(summe.kcal ?? 0))} / ${zahl(ziel.kcal)} kcal`)),
    eintraege.length
      ? el('ul', { class: 'eintragsliste' }, ...eintraege.map((e) => {
        const w = eintragNaehrwerte(e, lebensmittel);
        return el('li', {},
          el('button', { type: 'button', class: 'eintrag', onclick: () => bearbeiten(e) },
            el('span', {}, `${name(e.lebensmittelId)} `, el('span', { class: 'leise' }, `${zahl(e.gramm)} g`)),
            el('span', { class: 'leise klein' }, `${zahl(Math.round(w.kcal ?? 0))} kcal`)));
      }))
      : null,
    eintraege.length ? el('p', { class: 'leise klein' }, `Ziel: ${makroText(ziel)} · Ist: ${makroText(summe)}`) : null,
    el('button', { class: 'knopf zweitrangig voll', type: 'button', onclick: hinzufuegen }, '+ Lebensmittel'));
}

function wasserKarte(profil, typ, tag, speichern) {
  const karte = el('section', { class: 'karte' });
  const { presetsMl, mittagspause } = profil.wasser;
  const ziel = typ.wasserBisMittagMl;
  let offeneListe = false;

  const hinzufuegen = (ml) => {
    tag.wasser.push({ ml, zeit: new Date().toISOString() });
    speichern();
    zeichneKarte();
  };

  const zeichneKarte = () => {
    const gesamt = wasserSumme(tag.wasser);
    const bisMittag = wasserBisUhrzeit(tag.wasser, mittagspause);

    const eingabe = el('input', {
      type: 'number',
      inputMode: 'numeric',
      min: 1,
      placeholder: 'ml',
      'aria-label': 'Wassermenge in ml',
    });
    const fehler = el('p', { class: 'warnung klein', role: 'alert' });
    const manuell = () => {
      const { ml, fehler: meldung } = pruefeWassermenge(eingabe.value);
      if (meldung) { fehler.textContent = meldung; return; }
      hinzufuegen(ml);
    };
    eingabe.addEventListener('keydown', (e) => { if (e.key === 'Enter') manuell(); });

    const liste = el('details', {
      open: offeneListe,
      ontoggle: (e) => { offeneListe = e.currentTarget.open; },
    },
    el('summary', {}, `Einträge (${tag.wasser.length})`),
    el('ul', { class: 'eintragsliste' }, ...tag.wasser
      .map((eintrag, index) => ({ eintrag, index }))
      .reverse()
      .map(({ eintrag, index }) => el('li', {},
        el('span', {}, `${uhrzeitFormat.format(new Date(eintrag.zeit))} · ${zahl(eintrag.ml)} ml`),
        el('button', {
          class: 'knopf-klein',
          type: 'button',
          'aria-label': `${eintrag.ml} ml löschen`,
          onclick: () => { tag.wasser.splice(index, 1); speichern(); zeichneKarte(); },
        }, '✕')))));

    karte.replaceChildren(
      el('h2', { class: 'zeile' }, '💧 Wasser', el('span', { class: 'leise klein' }, `Tag: ${zahl(gesamt)} ml`)),
      balkenZeile(`Bis Mittag (${mittagspause} Uhr)`, bisMittag, ziel, 'ml', bisMittag >= ziel ? 'erreicht' : 'wasser'),
      el('div', { class: 'knopfreihe presets' },
        ...presetsMl.map((ml) => el('button', { class: 'knopf', type: 'button', onclick: () => hinzufuegen(ml) }, `+${zahl(ml)} ml`))),
      el('div', { class: 'manuell' },
        eingabe,
        el('button', { class: 'knopf zweitrangig', type: 'button', onclick: manuell }, 'Hinzufügen')),
      fehler,
      tag.wasser.length ? liste : null,
    );
  };

  zeichneKarte();
  return karte;
}

function morningStackKarte(profil, lebensmittel, fix, tag, aendern) {
  const name = (id) => lebensmittel.find((l) => l.id === id)?.name ?? id;
  return el('section', { class: 'karte' },
    el('h2', {}, `🌅 ${profil.morningStack.name}`),
    el('p', { class: 'leise klein' },
      profil.morningStack.zutaten.map((z) => `${zahl(z.gramm)} g ${name(z.lebensmittelId)}`).join(' · ')),
    el('p', {}, makroText(fix.morningStack)),
    schalter(tag.morningStackGenommen, (wert) => { tag.morningStackGenommen = wert; aendern(); }, 'Getrunken'));
}

function supplementKarte(profil, tag, aendern) {
  const aktive = profil.supplements.filter((s) => s.aktiv);
  if (!aktive.length) return null;
  const genommen = aktive.filter((s) => tag.supplements[s.id]).length;
  return el('section', { class: 'karte' },
    el('h2', { class: 'zeile' }, '💊 Supplements', el('span', { class: 'leise klein' }, `${genommen} von ${aktive.length}`)),
    ...aktive.map((s) => schalter(Boolean(tag.supplements[s.id]), (wert) => {
      tag.supplements[s.id] = wert;
      aendern();
    }, s.name, el('span', { class: 'leise klein' }, ` · ${s.dosis}`))));
}
