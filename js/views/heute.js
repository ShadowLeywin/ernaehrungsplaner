// Tagesansicht: Tagesziele mit Fortschritt, Wasser, Morning Stack, Supplements,
// Einträge pro Mahlzeit und Zähler (Tag / Wochendurchschnitt).
import { el, setze, zahl, zahlFeld, schalter } from '../ui.js';
import { kopfBild } from '../bilder.js';
import { holeProfil, speichereProfil, holeTag, holeTage, speichereTag } from '../state.js';
import { holeLebensmittel } from '../lebensmittel.js';
import { tagestypFuerDatum, mahlzeitenZiele, datumSchluessel } from '../logic/ziele.js';
import { fixeNaehrwerte } from '../logic/fixeintraege.js';
import { wasserSumme, wasserBisUhrzeit, pruefeWassermenge } from '../logic/wasser.js';
import {
  eintragNaehrwerte, mahlzeitSumme, tagesNaehrwerte, gemueseObstGramm,
  wochenSchluessel, wochenDurchschnitt, neueEintragsId,
} from '../logic/tag.js';
import { lese, anzahl, schreibe } from '../db.js';
import { backupErinnerungFaellig } from '../logic/backup.js';
import { durchschnitt, anpassungsVorschlag } from '../logic/gewicht.js';
import { holeGewichtsReihe } from './gewicht.js';
import { oeffneEintragDialog } from './eintrag-dialog.js';
import { icon } from '../icons.js';
import { UEBUNGEN } from '../daten/uebungen.js';
import { uebungsVerzeichnis, zusatzKcal, zielMitZusatz } from '../logic/training.js';

const uebungsVerzeichnisCache = uebungsVerzeichnis(UEBUNGEN);
import { balkenZeile, zaehlerInhalt } from './zaehler.js';
import { oeffneMemoDialog } from './memo-dialog.js';
import { kopiereMahlzeit, vorlageAusMahlzeit, eintraegeAusVorlage } from '../logic/schnell.js';
import { rest, wasFehlt, mikroTipps, KOFFEIN, KOFFEIN_GRENZE } from '../logic/vorschlaege.js';
import { spracheVerfuegbar, spracheErlaubt, setzeSpracheErlaubt } from '../sprache.js';
import { episch } from '../darstellung.js';
import { ERNAEHRUNGSWEISEN, UNVERTRAEGLICHKEITEN, DIAETEN, diaetMakros } from '../logic/ernaehrungsweise.js';

const datumFormat = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
const uhrzeitFormat = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });

// Bleibt beim Wechsel zwischen Reitern erhalten; beim Neustart der App wieder heute
let angezeigtesDatum = null;
let zaehlerModus = 'tag';
let kontextEinstellung = {};

export const heute = {
  get titel() { return episch('Taverne', 'Ernährung'); },
  einstellungen: ernaehrungsEinstellungen,
  render() {
    const wurzel = el('div');
    lade(wurzel);
    return wurzel;
  },
};

function lade(wurzel) {
  const datum = angezeigtesDatum ?? new Date();
  Promise.all([
    holeProfil(), holeLebensmittel(), holeTag(datumSchluessel(datum)),
    lese('einstellungen', 'letztesBackup'), anzahl('tage'), holeGewichtsReihe(),
    holeTag(datumSchluessel(new Date(datum.getFullYear(), datum.getMonth(), datum.getDate() - 1))), lese('einstellungen', 'mahlzeitVorlagen'),
  ])
    .then(([profil, daten, tag, letztesBackup, anzahlTage, gewichte, gestern, mahlzeitVorlagen]) => zeichne(wurzel, {
      profil, lebensmittel: daten.lebensmittel, tag, datum, gewichte, wurzel, gestern, mahlzeitVorlagen: mahlzeitVorlagen ?? [],
      backupFaellig: backupErinnerungFaellig(letztesBackup, anzahlTage > 0),
    }))
    .catch((fehler) => setze(wurzel, el('p', { class: 'warnung' }, fehler.message)));
}

const makroText = (w) => `${zahl(Math.round(w.kcal ?? 0))} kcal · P ${zahl(Math.round(w.protein ?? 0))} · KH ${zahl(Math.round(w.kh ?? 0))} · F ${zahl(Math.round(w.fett ?? 0))}`;

function zeichne(wurzel, kontext) {
  const { profil, lebensmittel, tag, datum } = kontext;
  kontextEinstellung = profil.ernaehrung ?? {};
  const { typ: planTyp, notiz } = tagestypFuerDatum(profil, datum);
  // Zusatz-Training erhöht das Tagesziel (Hybrid-Regel); geplantes Training steckt im Tagestyp
  const gewichtKg = kontext.gewichte.at(-1)?.kg ?? profil.koerper.gewichtKg ?? 75;
  const typ = zielMitZusatz(planTyp, zusatzKcal(tag, uebungsVerzeichnisCache, gewichtKg));
  const fix = fixeNaehrwerte(profil, lebensmittel);
  const ziele = mahlzeitenZiele(typ, profil.mahlzeiten, fix.gesamt);
  const ist = tagesNaehrwerte(tag, profil, lebensmittel);

  // Nach jeder Änderung speichern und neu zeichnen, damit alle Summen stimmen
  const aendern = async () => {
    await speichereTag(tag);
    zeichne(wurzel, kontext);
  };

  const zaehlerBereich = el('div');
  setze(wurzel,
    kopfBild('taverne', 'Taverne'),
    begruessung(profil, datum),
    kontext.backupFaellig
      ? el('a', { class: 'karte hinweis-karte', href: '#/backup' },
        icon('backup'), el('span', {}, 'Dein letztes Backup ist über eine Woche alt (oder fehlt). Jetzt sichern →'))
      : null,
    datumsLeiste(wurzel, datum),
    heroKarte(typ, notiz, ist, profil.ernaehrung?.diaet === 'intervallfasten' ? `${profil.ernaehrung.fensterVon}–${profil.ernaehrung.fensterBis}` : null),
    ratKarte(kontext, typ, ist),
    gewichtKarte(kontext),
    wasserKarte(profil, typ, tag, () => speichereTag(tag)),
    koffeinKarte(tag, () => speichereTag(tag)),
    profil.morningStack.aktiv ? morningStackKarte(profil, lebensmittel, fix, tag, aendern) : null,
    supplementKarte(profil, tag, aendern),
    ...profil.mahlzeiten.map((m) => mahlzeitKarte(m, ziele.find((z) => z.id === m.id), tag, lebensmittel, aendern, kontext)),
    el('section', { class: 'karte' },
      el('div', { class: 'zeile' },
        el('h2', {}, episch('Vorratsbuch', 'Zähler')),
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
    setze(zaehlerBereich, ...zaehlerInhalt({
      werte: ist, gemueseObst: gemueseObstGramm(tag, lebensmittel), typ, referenzgruppe: profil.referenzgruppe,
    }));
  } else {
    setze(zaehlerBereich, el('p', { class: 'leise' }, 'Lade Woche …'));
    const schluessel = wochenSchluessel(datum);
    holeTage(schluessel).then((tage) => {
      // Den angezeigten Tag mit seinem aktuellen Stand verwenden
      const woche = tage.map((t) => (t.datum === tag.datum ? tag : t));
      const schnitt = wochenDurchschnitt(woche, profil, lebensmittel);
      setze(zaehlerBereich,
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

function begruessung(profil, datum) {
  if (datumSchluessel(datum) !== datumSchluessel(new Date())) return null;
  const stunde = new Date().getHours();
  const gruss = stunde < 11 ? 'Guten Morgen' : stunde < 17 ? 'Hallo' : stunde < 22 ? 'Guten Abend' : 'Gute Nacht';
  return el('p', { class: 'begruessung' }, profil.name ? `${gruss}, ${profil.name} 👋` : `${gruss} 👋`);
}

function datumsLeiste(wurzel, datum) {
  const istHeute = datumSchluessel(datum) === datumSchluessel(new Date());
  const springe = (tage) => {
    angezeigtesDatum = tage === 0 ? null : new Date(datum.getFullYear(), datum.getMonth(), datum.getDate() + tage);
    if (angezeigtesDatum && datumSchluessel(angezeigtesDatum) === datumSchluessel(new Date())) angezeigtesDatum = null;
    lade(wurzel);
  };
  return el('div', { class: 'datumsleiste' },
    el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Vorheriger Tag', onclick: () => springe(-1) }, icon('zurueck', 22)),
    el('div', { style: 'text-align:center' },
      el('strong', {}, datumFormat.format(datum)),
      istHeute ? null : el('div', {}, el('button', { class: 'chip', type: 'button', onclick: () => springe(0), style: 'min-height:30px;padding:3px 12px;margin-top:4px' }, 'Zu heute'))),
    istHeute
      ? el('span', { class: 'knopf-klein' })
      : el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Nächster Tag', onclick: () => springe(1) }, icon('weiter', 22)));
}

const RING_R = 56;
const RING_U = 2 * Math.PI * RING_R;

/** Kopfkarte: Tagestyp, Kalorien-Ring (übrig) und Makro-Balken. */
function heroKarte(typ, notiz, ist, fenster = null) {
  const SVG = 'http://www.w3.org/2000/svg';
  const kcal = ist.kcal ?? 0;
  const uebrig = Math.round(typ.kcal - kcal);
  const anteil = typ.kcal > 0 ? Math.min(1, kcal / typ.kcal) : 0;
  const drueber = uebrig < 0;

  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 136 136');
  svg.innerHTML = `<defs><linearGradient id="ring-verlauf" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" style="stop-color: var(--akzent)"/><stop offset="1" style="stop-color: var(--akzent-2)"/>
    </linearGradient></defs>
    <circle class="ring-spur" cx="68" cy="68" r="${RING_R}"/>
    <circle class="ring-wert" cx="68" cy="68" r="${RING_R}" stroke-dasharray="${RING_U}" stroke-dashoffset="${RING_U}"/>`;
  // Nach dem Einfügen animiert von 0 auf den Wert
  requestAnimationFrame(() => requestAnimationFrame(() => {
    svg.querySelector('.ring-wert').setAttribute('stroke-dashoffset', String(RING_U * (1 - anteil)));
  }));

  const makro = (name, wert, ziel) => {
    const verhaeltnis = ziel > 0 ? (wert ?? 0) / ziel : 0;
    return el('div', {},
      el('div', { class: 'zeile' },
        el('span', {}, name),
        el('span', { class: 'leise' }, `${zahl(Math.round(wert ?? 0))} / ${zahl(ziel)} g`)),
      el('div', { class: `balken${verhaeltnis > 1.1 ? ' status-zu_viel' : ''}` },
        el('div', { style: `width:${Math.min(100, verhaeltnis * 100)}%;background:${verhaeltnis > 1.1 ? 'var(--warnung)' : 'var(--verlauf)'}` })));
  };

  return el('section', { class: 'karte hero' },
    el('div', { class: 'hero-oben' },
      el('h2', {}, typ.name),
      el('div', { class: 'chips' },
        typ.extraKcal ? el('a', { class: 'marke', href: '#/training' }, `+${zahl(typ.extraKcal)} kcal Training`) : null,
        notiz ? el('span', { class: 'marke' }, notiz) : null,
        fenster ? el('span', { class: 'marke' }, `Essensfenster ${fenster}`) : null)),
    el('div', { class: 'hero-mitte' },
      el('div', { class: `ring${drueber ? ' drueber' : ''}`, role: 'img', 'aria-label': `${Math.abs(uebrig)} kcal ${drueber ? 'über dem Ziel' : 'übrig'}` },
        svg,
        el('div', { class: 'ring-text' },
          el('strong', {}, zahl(Math.abs(uebrig))),
          el('span', {}, drueber ? 'kcal drüber' : 'kcal übrig'))),
      el('div', { class: 'makro-mini' },
        makro('Protein', ist.protein, typ.protein),
        makro('Kohlenhydrate', ist.kh, typ.kh),
        makro('Fett', ist.fett, typ.fett))),
    el('div', { class: 'hero-fuss' },
      el('span', {}, 'Gegessen ', el('strong', {}, `${zahl(Math.round(kcal))} kcal`)),
      el('span', {}, 'Ziel ', el('strong', {}, `${zahl(typ.kcal)} kcal`))));
}

function gewichtKarte({ tag, profil, gewichte, wurzel }) {
  const karte = el('section', { class: 'karte' });
  const schnitt = durchschnitt(gewichte, tag.datum, 7, 1);
  const vorschlag = anpassungsVorschlag(gewichte, profil.ziel, datumSchluessel(new Date()), profil.ziel.letzteEntscheidung ?? null);

  const speichern = async (wert) => {
    if (wert == null) delete tag.gewichtKg;
    else tag.gewichtKg = wert;
    await speichereTag(tag);
    lade(wurzel);
  };

  const zeigeEingabe = () => {
    const eingabe = el('input', {
      type: 'number',
      inputMode: 'decimal',
      step: 0.1,
      min: 30,
      max: 300,
      value: tag.gewichtKg ?? '',
      placeholder: 'kg',
      'aria-label': 'Gewicht in kg',
    });
    const fehler = el('p', { class: 'warnung klein', role: 'alert' });
    const ok = () => {
      const wert = Math.round(Number(eingabe.value.replace(',', '.')) * 10) / 10;
      if (!(wert >= 30 && wert <= 300)) { fehler.textContent = 'Bitte ein Gewicht zwischen 30 und 300 kg eingeben.'; return; }
      speichern(wert);
    };
    eingabe.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
    return [
      el('div', { class: 'manuell' },
        eingabe,
        el('button', { class: 'knopf', type: 'button', onclick: ok }, 'Speichern')),
      fehler,
    ];
  };

  const zeichneKarte = (bearbeiten) => setze(karte,
    el('div', { class: 'zeile' },
      el('h2', {}, '⚖️ Gewicht'),
      el('a', { href: '#/gewicht', class: 'klein' }, 'Verlauf →')),
    tag.gewichtKg && !bearbeiten
      ? el('div', { class: 'zeile' },
        el('p', { class: 'grosszahl' }, `${zahl(tag.gewichtKg)} kg`),
        el('button', { class: 'knopf zweitrangig', type: 'button', onclick: () => zeichneKarte(true) }, 'Ändern'))
      : zeigeEingabe(),
    schnitt != null ? el('p', { class: 'leise klein' }, `Ø 7 Tage: ${zahl(Math.round(schnitt * 10) / 10)} kg`) : null,
    vorschlag.status === 'anpassen'
      ? el('a', { href: '#/gewicht', class: 'klein warnung' }, `Kalorien-Anpassung vorgeschlagen (${vorschlag.kcalProTag > 0 ? '+' : ''}${vorschlag.kcalProTag} kcal/Tag) →`)
      : null);

  zeichneKarte(false);
  return karte;
}

function mahlzeitKarte(mahlzeit, ziel, tag, lebensmittel, aendern, kontext) {
  const eintraege = tag.eintraege.filter((e) => e.mahlzeit === mahlzeit.id);
  const summe = mahlzeitSumme(tag, mahlzeit.id, lebensmittel);
  const name = (id) => lebensmittel.find((l) => l.id === id)?.name ?? `Unbekannt (${id})`;

  const bearbeiten = (eintrag) => oeffneEintragDialog({
    lebensmittel,
    einstellung: kontextEinstellung,
    titel: mahlzeit.name,
    eintrag,
    beiSpeichern: (lebensmittelId, gramm) => { Object.assign(eintrag, { lebensmittelId, gramm }); aendern(); },
    beiLoeschen: () => { tag.eintraege.splice(tag.eintraege.indexOf(eintrag), 1); aendern(); },
  });
  const hinzufuegen = () => oeffneEintragDialog({
    lebensmittel,
    einstellung: kontextEinstellung,
    titel: mahlzeit.name,
    beiSpeichern: (lebensmittelId, gramm) => {
      tag.eintraege.push({ id: neueEintragsId(), mahlzeit: mahlzeit.id, lebensmittelId, gramm, zeit: new Date().toISOString() });
      aendern();
    },
    // Ohne Menge: Dialog bleibt offen, gespeichert wird sofort, neu gezeichnet erst beim Schließen
    beiOhneMenge: (lebensmittelId) => {
      tag.eintraege.push({ id: neueEintragsId(), mahlzeit: mahlzeit.id, lebensmittelId, gramm: 0, offen: true, zeit: new Date().toISOString() });
      aendern();
    },
  });

  return el('section', { class: 'karte mahlzeit' },
    el('div', { class: 'zeile' },
      el('h2', {}, mahlzeit.name,
        el('button', {
          class: `knopf-klein memo-knopf${eintraege.some((e) => e.offen || !e.gramm) ? ' offen' : ''}`, type: 'button',
          'aria-label': `Mengen-Memo für ${mahlzeit.name}`, title: 'Mengen-Memo',
          onclick: () => oeffneMemoDialog({ tag, profil: kontext.profil, lebensmittel, beiSpeichern: aendern, mahlzeitId: mahlzeit.id }),
        }, icon('stift', 18))),
      el('span', { class: 'leise klein' }, `${zahl(Math.round(summe.kcal ?? 0))} / ${zahl(ziel.kcal)} kcal`)),
    el('div', { class: 'balken mini' }, el('div', {
      style: `width:${ziel.kcal ? Math.min(100, ((summe.kcal ?? 0) / ziel.kcal) * 100) : 0}%;`
        + `background:${(summe.kcal ?? 0) > ziel.kcal * 1.15 ? 'var(--warnung)' : 'var(--verlauf)'}`,
    })),
    eintraege.length
      ? el('ul', { class: 'eintragsliste' }, ...eintraege.map((e) => {
        const w = eintragNaehrwerte(e, lebensmittel);
        return el('li', {},
          el('button', { type: 'button', class: 'eintrag', onclick: () => bearbeiten(e) },
            el('span', {}, `${name(e.lebensmittelId)} `, e.offen || !e.gramm
              ? el('span', { class: 'marke warn' }, 'Menge offen')
              : el('span', { class: 'leise' }, `${zahl(e.gramm)} g`)),
            el('span', { class: 'leise klein' }, `${zahl(Math.round(w.kcal ?? 0))} kcal`)));
      }))
      : null,
    eintraege.length ? el('p', { class: 'leise klein' }, `Ziel: ${makroText(ziel)} · Ist: ${makroText(summe)}`) : null,
    el('button', { class: 'knopf zweitrangig voll', type: 'button', onclick: hinzufuegen }, icon('plus', 18), 'Lebensmittel'),
    schnellLeiste(mahlzeit, tag, eintraege, aendern, kontext));
}

/** Gestern kopieren, Vorlage einfügen, Mahlzeit als Vorlage speichern. */
function schnellLeiste(mahlzeit, tag, eintraege, aendern, kontext) {
  const gestern = kopiereMahlzeit(kontext.gestern, mahlzeit.id, mahlzeit.id, neueEintragsId);
  const vorlagen = kontext.mahlzeitVorlagen;
  const bereich = el('div');
  const mitMenge = eintraege.filter((e) => e.gramm > 0);
  const speichereVorlagen = (liste) => schreibe('einstellungen', 'mahlzeitVorlagen', liste).then(() => { kontext.mahlzeitVorlagen = liste; });
  const zeigeVorlagen = () => setze(bereich, el('div', { class: 'chips' },
    ...vorlagen.map((v) => el('span', { class: 'chip-gruppe' },
      el('button', { class: 'chip', type: 'button', onclick: () => { tag.eintraege.push(...eintraegeAusVorlage(v, mahlzeit.id, neueEintragsId)); aendern(); } }, `＋ ${v.name}`),
      el('button', { class: 'chip chip-x', type: 'button', 'aria-label': `Vorlage ${v.name} löschen`, onclick: () => speichereVorlagen(vorlagen.filter((x) => x.id !== v.id)).then(() => aendern()) }, '×')))));
  const zeigeSpeichern = () => {
    const name = el('input', { type: 'text', value: mahlzeit.name, 'aria-label': 'Name der Vorlage' });
    setze(bereich, el('div', { class: 'manuell' }, name, el('button', {
      class: 'knopf zweitrangig', type: 'button',
      onclick: () => {
        const v = vorlageAusMahlzeit(tag, mahlzeit.id, neueEintragsId(), name.value);
        if (v) speichereVorlagen([...vorlagen, v]).then(() => aendern());
      },
    }, 'Speichern')));
  };
  const chips = [
    gestern.length && !eintraege.length ? el('button', { class: 'chip', type: 'button', onclick: () => { tag.eintraege.push(...gestern); aendern(); } }, `↺ Wie gestern (${gestern.length})`) : null,
    vorlagen.length ? el('button', { class: 'chip', type: 'button', onclick: zeigeVorlagen }, `Vorlagen (${vorlagen.length})`) : null,
    mitMenge.length ? el('button', { class: 'chip', type: 'button', onclick: zeigeSpeichern }, '☆ Als Vorlage') : null,
  ].filter(Boolean);
  return chips.length ? el('div', { class: 'schnell-leiste' }, el('div', { class: 'chips' }, ...chips), bereich) : null;
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
        }, icon('schliessen', 18))))));

    setze(karte,
      el('h2', { class: 'zeile' }, episch('💧 Quelle', '💧 Wasser'), el('span', { class: 'leise klein' }, `Tag: ${zahl(gesamt)} ml`)),
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
    el('h2', { class: 'zeile' }, episch('⚗️ Elixiere', '💊 Supplements'), el('span', { class: 'leise klein' }, `${genommen} von ${aktive.length}`)),
    ...aktive.map((s) => schalter(Boolean(tag.supplements[s.id]), (wert) => {
      tag.supplements[s.id] = wert;
      aendern();
    }, s.name, el('span', { class: 'leise klein' }, ` · ${s.dosis}`))));
}

/** Zahnrad-Einstellungen der Ernährungsseite: Wasser-Schnellknöpfe und Mittagspause (sofort gespeichert). */
function ernaehrungsEinstellungen() {
  const wurzel = el('div', {}, el('p', { class: 'leise' }, 'Lade …'));
  holeProfil().then((profil) => {
    const w = profil.wasser;
    const speichern = () => speichereProfil(profil);
    const zeichneEinstellungen = () => setze(wurzel,
      el('h2', { class: 'abschnitt' }, 'Wasser'),
      el('div', { class: 'felder' },
        el('label', { class: 'feld' }, el('span', {}, 'Mittagspause ab'), el('input', {
          type: 'time', value: w.mittagspause,
          oninput: (e) => { if (e.target.value) { w.mittagspause = e.target.value; speichern(); } },
        }))),
      el('p', { class: 'feld', style: 'margin-top:12px' }, el('span', {}, 'Schnellknöpfe (1 bis 3)')),
      ...w.presetsMl.map((ml, i) => el('div', { class: 'aktivitaet' },
        zahlFeld(`Knopf ${i + 1}`, ml, 'ml', (wert) => { w.presetsMl[i] = Math.round(wert); speichern(); }),
        w.presetsMl.length > 1 ? el('button', {
          class: 'knopf-klein', type: 'button', 'aria-label': `Knopf ${i + 1} entfernen`,
          onclick: () => { w.presetsMl.splice(i, 1); speichern(); zeichneEinstellungen(); },
        }, icon('schliessen', 18)) : null)),
      w.presetsMl.length < 3 ? el('button', {
        class: 'knopf zweitrangig', type: 'button',
        onclick: () => { w.presetsMl.push(500); speichern(); zeichneEinstellungen(); },
      }, icon('plus', 18), 'Knopf') : null,
      ...ernaehrungsweiseBereich(profil, speichern, zeichneEinstellungen),
      el('h2', { class: 'abschnitt' }, 'Spracheingabe'),
      spracheVerfuegbar()
        ? schalter(spracheErlaubt(), (wert) => setzeSpracheErlaubt(wert), 'Diktieren im Mengen-Memo erlauben')
        : el('p', { class: 'leise klein' }, 'Dieser Browser unterstützt keine Spracheingabe.'),
      el('p', { class: 'leise klein' }, 'Hinweis: Chrome schickt die Sprachaufnahme zur Erkennung an Google. Ausgewertet wird der Text danach nur auf deinem Gerät.'),
      el('p', { class: 'leise klein' }, 'Wird sofort gespeichert. Ziele, Supplements und mehr unter Profil & Ziele.'));
    zeichneEinstellungen();
  });
  return wurzel;
}

/** Ernährungsweise, Unverträglichkeiten und Diät – drei getrennte Auswahlen. Diät-Makros nur nach Bestätigung. */
function ernaehrungsweiseBereich(profil, speichern, neuZeichnen) {
  const e = profil.ernaehrung;
  const auswahl = (beschriftung, optionen, wert, setzen) => el('label', { class: 'feld' }, el('span', {}, beschriftung),
    el('select', { onchange: (ev) => { setzen(ev.target.value); speichern(); neuZeichnen(); } },
      ...Object.entries(optionen).map(([id, o]) => el('option', { value: id, selected: id === wert }, o.name))));
  const kg = profil.koerper.gewichtKg ?? 75;
  const vorschlaege = profil.tagestypen.map((t) => ({ t, neu: diaetMakros(t, e.diaet, kg) })).filter((x) => x.neu);
  const bestaetigen = el('div');
  return [
    el('h2', { class: 'abschnitt' }, episch('Speiseregeln der Taverne', 'Ernährungsweise')),
    auswahl('Ernährungsweise', ERNAEHRUNGSWEISEN, e.weise, (w) => { e.weise = w; }),
    el('p', { class: 'leise klein' }, ERNAEHRUNGSWEISEN[e.weise]?.text ?? ''),
    el('p', { class: 'feld', style: 'margin-top:8px' }, el('span', {}, 'Unverträglichkeiten')),
    ...Object.entries(UNVERTRAEGLICHKEITEN).map(([id, u]) => schalter(e.unvertraeglich.includes(id), (an) => {
      e.unvertraeglich = an ? [...new Set([...e.unvertraeglich, id])] : e.unvertraeglich.filter((x) => x !== id);
      speichern();
    }, u.name)),
    el('div', { style: 'margin-top:8px' }, auswahl('Diät', DIAETEN, e.diaet, (d) => { e.diaet = d; })),
    el('p', { class: 'leise klein' }, DIAETEN[e.diaet]?.text ?? ''),
    e.diaet === 'intervallfasten' ? el('div', { class: 'felder' },
      el('label', { class: 'feld' }, el('span', {}, 'Essen ab'), el('input', { type: 'time', value: e.fensterVon, oninput: (ev) => { if (ev.target.value) { e.fensterVon = ev.target.value; speichern(); } } })),
      el('label', { class: 'feld' }, el('span', {}, 'Essen bis'), el('input', { type: 'time', value: e.fensterBis, oninput: (ev) => { if (ev.target.value) { e.fensterBis = ev.target.value; speichern(); } } })))
      : null,
    vorschlaege.length ? el('div', { class: 'vorschlag' },
      el('p', { class: 'klein' }, el('strong', {}, 'Vorschlag für deine Makros (gleiche Kalorien):')),
      el('ul', { class: 'liste-einfach klein' }, ...vorschlaege.map(({ t, neu }) => el('li', {},
        `${t.name}: P ${t.protein}→${neu.protein} g · KH ${t.kh}→${neu.kh} g · F ${t.fett}→${neu.fett} g`))),
      el('button', {
        class: 'knopf zweitrangig', type: 'button',
        onclick: () => setze(bestaetigen, el('div', { class: 'knopfreihe' },
          el('button', {
            class: 'knopf', type: 'button',
            onclick: () => { for (const { t, neu } of vorschlaege) Object.assign(t, neu); speichern(); neuZeichnen(); },
          }, 'Ja, übernehmen'),
          el('button', { class: 'knopf zweitrangig', type: 'button', onclick: () => setze(bestaetigen) }, 'Abbrechen'))),
      }, 'Makros übernehmen …'),
      bestaetigen)
      : null,
  ];
}

/** Brom's Rat: was heute noch fehlt (aus Favoriten und zuletzt Gegessenem) und Mikronährstoff-Lücken der Woche. */
function ratKarte({ tag, profil, lebensmittel, datum }, typ, ist) {
  if (datumSchluessel(datum) !== datumSchluessel(new Date())) return null;
  const karte = el('section', { class: 'karte rat-karte', hidden: true });
  const r = rest(ist, typ);
  Promise.all([lese('einstellungen', 'favoriten'), lese('einstellungen', 'zuletzt'), holeTage(wochenSchluessel(datum))]).then(([fav, zul, woche]) => {
    const nachId = new Map(lebensmittel.map((l) => [l.id, l]));
    const menge = new Map((zul ?? []).map((z) => [z.id, z.gramm]));
    const ids = [...new Set([...(fav ?? []), ...(zul ?? []).map((z) => z.id)])].slice(0, 25);
    const kandidaten = ids.map((id) => nachId.get(id)).filter(Boolean)
      .map((lm) => ({ lm, gramm: menge.get(lm.id) ?? lm.stueckG ?? 100 }));
    const stunde = new Date().getHours();
    const optionen = stunde >= 14 && tag.eintraege.length ? wasFehlt(r, kandidaten) : [];
    const schnitt = wochenDurchschnitt(woche.map((t) => (t.datum === tag.datum ? tag : t)), profil, lebensmittel);
    const tipps = schnitt.tage >= 3 ? mikroTipps(schnitt.werte, profil.referenzgruppe, profil.tagestypen.find((t) => t.basis) ?? typ, lebensmittel, 2) : [];
    if (!optionen.length && !tipps.length) return;
    setze(karte,
      el('h2', {}, episch('🔥 Brom rät', '💡 Tipps')),
      optionen.length ? el('p', { class: 'klein' }, `Noch ${zahl(Math.max(0, r.kcal))} kcal und ${zahl(Math.max(0, r.protein))} g Protein offen. Das würde passen:`) : null,
      ...optionen.map((o) => el('div', { class: 'rat-option' },
        el('span', {}, o.teile.map((t) => `${zahl(t.gramm)} g ${t.lm.name}`).join(' + ')),
        el('span', { class: 'leise klein' }, `${zahl(o.kcal)} kcal · ${zahl(o.protein)} g P`))),
      ...tipps.map((t) => el('p', { class: 'klein' },
        el('strong', {}, `${t.name}: `), `diese Woche nur ${t.anteil} % – gute Quellen: ${t.quellen.map((q) => q.name).join(', ') || '–'}.`)));
    karte.hidden = false;
  }).catch(() => {});
  return karte;
}

/** Koffein-Zähler mit Tagesgrenze (EFSA 400 mg) und Hinweis für den Schlaf am Nachmittag. */
function koffeinKarte(tag, speichern) {
  const karte = el('section', { class: 'karte' });
  const namen = { kaffee: '☕ Kaffee', espresso: 'Espresso', energy: '⚡ Energy', gruener_tee: '🍵 Tee', cola: 'Cola', preworkout: '💥 Pre-Workout' };
  const zeichne = () => {
    tag.koffein ??= [];
    const summe = tag.koffein.reduce((s, k) => s + k.mg, 0);
    const spaet = new Date().getHours() >= 15;
    setze(karte,
      el('div', { class: 'zeile' }, el('h2', {}, episch('☕ Wachtrank', '☕ Koffein')),
        el('span', { class: `klein${summe > KOFFEIN_GRENZE ? ' warnung' : ' leise'}` }, `${zahl(summe)} / ${KOFFEIN_GRENZE} mg`)),
      el('div', { class: 'chips' }, ...Object.entries(namen).map(([id, name]) => el('button', {
        class: 'chip', type: 'button',
        onclick: () => { tag.koffein.push({ art: id, mg: KOFFEIN[id], zeit: new Date().toISOString() }); speichern(); zeichne(); },
      }, name)),
      tag.koffein.length ? el('button', { class: 'chip', type: 'button', 'aria-label': 'Letzten Eintrag entfernen', onclick: () => { tag.koffein.pop(); speichern(); zeichne(); } }, '↶') : null),
      summe > KOFFEIN_GRENZE ? el('p', { class: 'warnung klein' }, 'Über 400 mg – das ist mehr, als die EFSA für einen Tag als unbedenklich einstuft.') : null,
      spaet && summe > 0 && tag.koffein.some((k) => new Date(k.zeit).getHours() >= 15) ? el('p', { class: 'leise klein' }, 'Koffein nach 15 Uhr kann den Schlaf stören – und Schlaf ist Muskelaufbau.') : null);
  };
  zeichne();
  return karte;
}
