// Tagesansicht. Bisher: Tagestyp mit Zielen, Morning Stack, Supplement-Checkliste, Ziele pro Mahlzeit.
// Einträge und Zähler folgen in Schritt 4.
import { el, zahl, schalter } from '../ui.js';
import { holeProfil, holeTag, speichereTag } from '../state.js';
import { holeLebensmittel } from '../lebensmittel.js';
import { tagestypFuerDatum, mahlzeitenZiele, datumSchluessel } from '../logic/ziele.js';
import { fixeNaehrwerte } from '../logic/fixeintraege.js';
import { wasserSumme, wasserBisUhrzeit, pruefeWassermenge } from '../logic/wasser.js';

const uhrzeitFormat = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });

const datumFormat = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

export const heute = {
  titel: 'Heute',
  render() {
    const wurzel = el('div');
    const datum = new Date();
    Promise.all([holeProfil(), holeLebensmittel(), holeTag(datumSchluessel(datum))])
      .then(([profil, daten, tag]) => zeichne(wurzel, profil, daten.lebensmittel, tag, datum))
      .catch((fehler) => wurzel.replaceChildren(el('p', { class: 'warnung' }, fehler.message)));
    return wurzel;
  },
};

const makroText = (w) => `${zahl(Math.round(w.kcal ?? 0))} kcal · P ${zahl(w.protein ?? 0)} · KH ${zahl(w.kh ?? 0)} · F ${zahl(w.fett ?? 0)}`;

function zeichne(wurzel, profil, lebensmittel, tag, datum) {
  const { typ, notiz } = tagestypFuerDatum(profil, datum);
  const fix = fixeNaehrwerte(profil, lebensmittel);
  const ziele = mahlzeitenZiele(typ, profil.mahlzeiten, fix.gesamt);
  const speichern = () => speichereTag(tag);

  wurzel.replaceChildren(
    el('section', { class: 'karte' },
      el('p', { class: 'leise klein' }, datumFormat.format(datum)),
      el('h2', {}, typ.name, notiz ? el('span', { class: 'marke' }, notiz) : null),
      el('p', { class: 'grosszahl' }, `${zahl(typ.kcal)} kcal`),
      el('div', { class: 'makroreihe' },
        makro('Protein', typ.protein),
        makro('KH', typ.kh),
        makro('Fett', typ.fett)),
      el('p', { class: 'leise klein' },
        `Gemüse ${zahl(typ.gemueseG)} g · Obst ${zahl(typ.obstG)} g · `
        + `Ballaststoffe ${typ.ballaststoffeMinG}–${typ.ballaststoffeMaxG} g · `
        + `Wasser bis Mittag ${zahl(typ.wasserBisMittagMl / 1000)} l`)),

    wasserKarte(profil, typ, tag, speichern),
    profil.morningStack.aktiv ? morningStackKarte(profil, lebensmittel, fix, tag, speichern) : null,
    supplementKarte(profil, tag, speichern),

    el('section', { class: 'karte' },
      el('h2', {}, 'Ziele pro Mahlzeit'),
      el('table', { class: 'tabelle' },
        el('thead', {}, el('tr', {}, ...['', 'kcal', 'P', 'KH', 'F'].map((t) => el('th', {}, t)))),
        el('tbody', {}, ...ziele.map((z) => el('tr', {},
          el('td', {}, z.name),
          ...[z.kcal, z.protein, z.kh, z.fett].map((w) => el('td', {}, zahl(w))))))),
      el('p', { class: 'leise klein' },
        `Nach Abzug von Morning Stack und Supplements (${makroText(fix.gesamt)}).`)),
  );
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
    const anteil = Math.min(100, Math.round((bisMittag / ziel) * 100));

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
      el('h2', { class: 'zeile' }, '💧 Wasser', el('span', { class: 'leise klein' }, `heute ${zahl(gesamt)} ml`)),
      el('p', { class: 'klein' }, `Bis Mittag (${mittagspause} Uhr): ${zahl(bisMittag)} / ${zahl(ziel)} ml`),
      el('div', {
        class: `balken${bisMittag >= ziel ? ' erreicht' : ''}`,
        role: 'progressbar',
        'aria-valuemin': 0,
        'aria-valuemax': ziel,
        'aria-valuenow': bisMittag,
      }, el('div', { style: `width:${anteil}%` })),
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

function morningStackKarte(profil, lebensmittel, fix, tag, speichern) {
  const name = (id) => lebensmittel.find((l) => l.id === id)?.name ?? id;
  return el('section', { class: 'karte' },
    el('h2', {}, `🌅 ${profil.morningStack.name}`),
    el('p', { class: 'leise klein' },
      profil.morningStack.zutaten.map((z) => `${zahl(z.gramm)} g ${name(z.lebensmittelId)}`).join(' · ')),
    el('p', {}, makroText(fix.morningStack)),
    schalter(tag.morningStackGenommen, (wert) => { tag.morningStackGenommen = wert; speichern(); }, 'Getrunken'));
}

function supplementKarte(profil, tag, speichern) {
  const aktive = profil.supplements.filter((s) => s.aktiv);
  if (!aktive.length) return null;
  const zaehler = el('span', { class: 'leise klein' });
  const aktualisiereZaehler = () => {
    const genommen = aktive.filter((s) => tag.supplements[s.id]).length;
    zaehler.textContent = `${genommen} von ${aktive.length}`;
  };
  aktualisiereZaehler();
  return el('section', { class: 'karte' },
    el('h2', { class: 'zeile' }, '💊 Supplements', zaehler),
    ...aktive.map((s) => schalter(Boolean(tag.supplements[s.id]), (wert) => {
      tag.supplements[s.id] = wert;
      aktualisiereZaehler();
      speichern();
    }, s.name, el('span', { class: 'leise klein' }, ` · ${s.dosis}`))));
}

function makro(name, gramm) {
  return el('div', { class: 'makro' }, el('strong', {}, `${zahl(gramm)} g`), el('span', { class: 'leise' }, name));
}
