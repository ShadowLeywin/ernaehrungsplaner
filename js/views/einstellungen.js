// Profil & Einstellungen: Körperdaten, Sport, Gewichtsziel, Tagestypen mit Zielen, Woche,
// Mahlzeitenverteilung, Referenzwerte, Wasser, Morning Stack und Supplements.
import { el, setze, zahl, zahlFeld, textFeld, schalter } from '../ui.js';
import { holeProfil, speichereProfil } from '../state.js';
import { holeLebensmittel } from '../lebensmittel.js';
import { kcalAusMakros, skaliereMakros, summeAnteile } from '../logic/ziele.js';
import { WOCHENTAGE, neuerTagestyp } from '../logic/profil.js';
import { naehrwerteZutaten } from '../logic/fixeintraege.js';
import { REFERENZGRUPPEN } from '../logic/referenzwerte.js';
import { NAEHRSTOFFE } from '../logic/naehrstoffe.js';
import { berechneTagesbedarf, berechneMakros } from '../logic/bedarf.js';
import { koerperFelder, alltagFeld, aktivitaetenListe, zielFelder, makroRegelFelder } from './profil-bausteine.js';
import { oeffneEintragDialog } from './eintrag-dialog.js';
import { THEMEN, MODI, ladeDarstellung, speichereDarstellung } from '../darstellung.js';
import { icon } from '../icons.js';

export const einstellungen = {
  titel: 'Profil & Einstellungen',
  reiter: 'mehr',
  render() {
    const wurzel = el('div');
    Promise.all([holeProfil(), holeLebensmittel()])
      .then(([profil, daten]) => zeichne(wurzel, profil, false, daten.lebensmittel))
      .catch((fehler) => setze(wurzel, el('p', { class: 'warnung' }, fehler.message)));
    return wurzel;
  },
};

const abschnitt = (titel) => el('h2', { class: 'abschnitt' }, titel);
const karte = (...kinder) => el('section', { class: 'karte' }, ...kinder);

/** Farbthema und Hell/Dunkel – wirkt sofort, gilt nur für dieses Gerät (nicht Teil des Profils). */
function darstellungKarte() {
  const k = karte();
  const zeichneKarte = () => {
    const aktuell = ladeDarstellung();
    const waehle = (aenderung) => { speichereDarstellung({ ...aktuell, ...aenderung }); zeichneKarte(); };
    setze(k,
      el('div', { class: 'themen' }, ...Object.entries(THEMEN).map(([id, t]) => el('button', {
        class: `thema${aktuell.thema === id ? ' aktiv' : ''}`,
        type: 'button',
        'aria-pressed': String(aktuell.thema === id),
        onclick: () => waehle({ thema: id }),
      },
      el('span', { class: 'thema-kreis', style: `background:linear-gradient(135deg, ${t.farben[0]}, ${t.farben[1]})` }),
      t.name))),
      el('div', { class: 'modus-reihe' },
        el('div', { class: 'umschalter', role: 'group', 'aria-label': 'Hell oder dunkel' },
          ...Object.entries(MODI).map(([id, name]) => el('button', {
            type: 'button',
            class: aktuell.modus === id ? 'aktiv' : '',
            'aria-pressed': String(aktuell.modus === id),
            onclick: () => waehle({ modus: id }),
          }, icon({ system: 'system', hell: 'sonne', dunkel: 'mond' }[id], 16), name)))));
  };
  zeichneKarte();
  return k;
}

function zeichne(wurzel, profil, geaendert, lebensmittel) {
  const status = el('p', { class: 'status', role: 'status' });
  const speichern = el('button', { class: 'knopf', type: 'button' }, 'Speichern');

  const pruefe = () => {
    const summe = summeAnteile(profil.mahlzeiten);
    speichern.disabled = summe !== 100;
    if (summe !== 100) status.textContent = `Die Mahlzeitenverteilung ergibt ${zahl(summe)} % statt 100 %.`;
    else status.textContent = geaendert ? 'Ungespeicherte Änderungen' : '';
  };
  const markiereGeaendert = () => { geaendert = true; pruefe(); };

  speichern.addEventListener('click', async () => {
    await speichereProfil(profil);
    geaendert = false;
    pruefe();
    status.textContent = 'Gespeichert ✓';
  });

  // Strukturänderungen (hinzufügen/entfernen) zeichnen die Seite neu, Scroll-Position bleibt
  const neuZeichnen = () => {
    const y = window.scrollY;
    zeichne(wurzel, profil, true, lebensmittel);
    window.scrollTo(0, y);
  };

  setze(wurzel,
    abschnitt('Design'),
    darstellungKarte(),
    abschnitt('Über dich'),
    karte(koerperFelder(profil, markiereGeaendert), alltagFeld(profil, markiereGeaendert)),
    abschnitt('Sport & Aktivitäten'),
    karte(aktivitaetenListe(profil, markiereGeaendert, neuZeichnen)),
    abschnitt('Gewichtsziel & Makro-Regeln'),
    karte(zielFelder(profil, markiereGeaendert), makroRegelFelder(profil, markiereGeaendert)),
    abschnitt('Tagestypen und Ziele'),
    ...profil.tagestypen.map((typ) => tagestypKarte(typ, profil, markiereGeaendert, neuZeichnen)),
    el('button', {
      class: 'knopf zweitrangig voll',
      type: 'button',
      onclick: () => {
        profil.tagestypen.push(neuerTagestyp(`typ${Date.now().toString(36)}`, 'Neuer Tagestyp'));
        neuZeichnen();
      },
    }, '+ Tagestyp'),
    abschnitt('Wochenzuordnung'),
    wochenKarte(profil, markiereGeaendert),
    abschnitt('Verteilung auf die Mahlzeiten'),
    mahlzeitenKarte(profil, markiereGeaendert),
    abschnitt('Referenzwerte Mikronährstoffe'),
    referenzKarte(profil, markiereGeaendert),
    abschnitt('Wasser'),
    wasserKarte(profil, markiereGeaendert),
    abschnitt('Morning Stack'),
    morningStackKarte(profil, lebensmittel, markiereGeaendert, neuZeichnen),
    abschnitt('Supplements'),
    ...profil.supplements.map((s) => supplementKarte(s, profil, lebensmittel, markiereGeaendert, neuZeichnen)),
    supplementHinzufuegen(profil, lebensmittel, neuZeichnen),
    el('div', { class: 'speicherleiste' }, status, speichern),
  );
  pruefe();
}

function vorschlagBox(text, unterzeile, beiUebernehmen, bereich) {
  return el('div', { class: 'vorschlag' },
    el('p', {}, el('strong', {}, 'Vorschlag: '), text, el('br'), el('span', { class: 'leise klein' }, unterzeile)),
    el('div', { class: 'knopfreihe' },
      el('button', { class: 'knopf', type: 'button', onclick: beiUebernehmen }, 'Übernehmen'),
      el('button', { class: 'knopf zweitrangig', type: 'button', onclick: () => setze(bereich) }, 'Verwerfen')));
}

function tagestypKarte(typ, profil, markiereGeaendert, neuZeichnen) {
  const basis = profil.tagestypen.find((t) => t.basis) ?? profil.tagestypen[0];
  const kontrolle = el('p', { class: 'leise klein' });
  const vorschlagBereich = el('div');

  const aktualisiereKontrolle = () => {
    const ausMakros = kcalAusMakros(typ);
    const differenz = ausMakros - typ.kcal;
    kontrolle.textContent = `Makros ergeben ${zahl(ausMakros)} kcal`
      + (Math.abs(differenz) > 25 ? ` – ${differenz > 0 ? '+' : ''}${zahl(differenz)} kcal zum Ziel` : ' ✓');
    kontrolle.classList.toggle('warnung', Math.abs(differenz) > 25);
  };

  const feld = (beschriftung, schluessel, einheit) => zahlFeld(beschriftung, typ[schluessel], einheit, (wert) => {
    typ[schluessel] = wert;
    aktualisiereKontrolle();
    markiereGeaendert();
  });

  const zeigeBedarf = () => {
    const bedarf = berechneTagesbedarf(profil, typ);
    if (!bedarf) {
      setze(vorschlagBereich, el('p', { class: 'warnung klein' }, 'Bitte zuerst unter „Über dich“ Geschlecht, Alter, Größe und Gewicht eintragen.'));
      return;
    }
    const makros = berechneMakros(bedarf.kcal, profil.koerper.gewichtKg, profil.makroRegeln);
    setze(vorschlagBereich, vorschlagBox(
      `${zahl(bedarf.kcal)} kcal · P ${makros.protein} g · KH ${makros.kh} g · F ${makros.fett} g`,
      `Grundumsatz ${zahl(bedarf.grundumsatz)} → mit Alltag ${zahl(bedarf.alltag)} + Sport ${zahl(bedarf.sport)} `
        + `${bedarf.zuschlag >= 0 ? '+' : '−'} Ziel ${zahl(Math.abs(bedarf.zuschlag))} kcal`,
      () => { Object.assign(typ, { kcal: bedarf.kcal }, makros); markiereGeaendert(); neuZeichnen(); },
      vorschlagBereich));
  };

  const zeigeSkalierung = () => {
    const vorschlag = skaliereMakros(basis, typ.kcal);
    setze(vorschlagBereich, vorschlagBox(
      `Protein ${vorschlag.protein} g · KH ${vorschlag.kh} g · Fett ${vorschlag.fett} g`,
      `= ${zahl(kcalAusMakros(vorschlag))} kcal. Protein wie am ${basis.name}, KH und Fett im gleichen Verhältnis.`,
      () => { Object.assign(typ, vorschlag); markiereGeaendert(); neuZeichnen(); },
      vorschlagBereich));
  };

  const loeschen = () => {
    const ersatz = profil.tagestypen.find((t) => t !== typ && t.basis) ?? profil.tagestypen.find((t) => t !== typ);
    for (const tag of profil.woche) if (tag.tagestyp === typ.id) tag.tagestyp = ersatz.id;
    profil.tagestypen.splice(profil.tagestypen.indexOf(typ), 1);
    if (typ.basis) ersatz.basis = true;
    markiereGeaendert();
    neuZeichnen();
  };

  const sportAuswahl = profil.aktivitaeten.length
    ? el('div', { class: 'sportauswahl' },
      el('span', { class: 'leise klein' }, 'Sport an diesem Tag:'),
      ...profil.aktivitaeten.map((a) => schalter((typ.aktivitaeten ?? []).includes(a.id), (an) => {
        typ.aktivitaeten = an ? [...(typ.aktivitaeten ?? []), a.id] : typ.aktivitaeten.filter((id) => id !== a.id);
        markiereGeaendert();
      }, a.name || 'Ohne Namen', el('span', { class: 'leise klein' }, ` · ${zahl(a.kcal)} kcal`))))
    : null;

  aktualisiereKontrolle();
  return karte(
    el('div', { class: 'felder' },
      textFeld('Name', typ.name, (wert) => { typ.name = wert; markiereGeaendert(); }),
      feld('Kalorienziel', 'kcal', 'kcal'),
      feld('Protein', 'protein', 'g'),
      feld('Kohlenhydrate', 'kh', 'g'),
      feld('Fett', 'fett', 'g')),
    kontrolle,
    sportAuswahl,
    el('div', { class: 'knopfreihe' },
      el('button', { class: 'knopf zweitrangig', type: 'button', onclick: zeigeBedarf }, 'Aus Körperdaten berechnen'),
      typ.basis ? null : el('button', { class: 'knopf zweitrangig', type: 'button', onclick: zeigeSkalierung }, `Aus ${basis.name} skalieren`)),
    typ.basis ? el('p', { class: 'leise klein' }, 'Basistag – andere Tage lassen sich aus ihm skalieren.') : null,
    vorschlagBereich,
    el('details', {},
      el('summary', {}, 'Weitere Tagesziele'),
      el('div', { class: 'felder' },
        feld('Gemüse', 'gemueseG', 'g'),
        feld('Obst', 'obstG', 'g'),
        feld('Ballaststoffe min.', 'ballaststoffeMinG', 'g'),
        feld('Ballaststoffe max.', 'ballaststoffeMaxG', 'g'),
        feld('Wasser bis Mittag', 'wasserBisMittagMl', 'ml'))),
    profil.tagestypen.length > 1
      ? el('button', { class: 'knopf zweitrangig gefahr', type: 'button', onclick: loeschen }, 'Tagestyp entfernen')
      : null);
}

function wochenKarte(profil, markiereGeaendert) {
  const zeilen = WOCHENTAGE.map((tag, i) => {
    const eintrag = profil.woche[i];
    const auswahl = el('select', {
      'aria-label': `Tagestyp ${tag}`,
      onchange: () => { eintrag.tagestyp = auswahl.value; markiereGeaendert(); },
    }, ...profil.tagestypen.map((t) => el('option', { value: t.id, selected: t.id === eintrag.tagestyp }, t.name)));
    const notiz = el('input', {
      type: 'text',
      value: eintrag.notiz,
      placeholder: 'Notiz',
      'aria-label': `Notiz ${tag}`,
      oninput: () => { eintrag.notiz = notiz.value; markiereGeaendert(); },
    });
    return el('div', { class: 'wochenzeile' }, el('span', { class: 'wochentag' }, tag.slice(0, 2)), auswahl, notiz);
  });
  return karte(...zeilen);
}

function referenzKarte(profil, markiereGeaendert) {
  const auswahl = el('select', {
    onchange: () => { profil.referenzgruppe = auswahl.value; markiereGeaendert(); },
  }, ...Object.entries(REFERENZGRUPPEN).map(([id, name]) => el('option', { value: id, selected: id === profil.referenzgruppe }, name)));
  return karte(el('label', { class: 'feld' }, el('span', {}, 'Gruppe (DGE)'), auswahl));
}

function wasserKarte(profil, markiereGeaendert) {
  const w = profil.wasser;
  const uhrzeit = el('input', {
    type: 'time',
    value: w.mittagspause,
    oninput: () => { if (uhrzeit.value) { w.mittagspause = uhrzeit.value; markiereGeaendert(); } },
  });
  return karte(
    el('div', { class: 'felder' },
      el('label', { class: 'feld' }, el('span', {}, 'Mittagspause ab'), uhrzeit),
      ...w.presetsMl.map((ml, i) => zahlFeld(`Knopf ${i + 1}`, ml, 'ml', (wert) => {
        w.presetsMl[i] = Math.round(wert);
        markiereGeaendert();
      }))),
    el('p', { class: 'leise klein' }, 'Das Ziel „Wasser bis Mittag“ steht beim jeweiligen Tagestyp unter „Weitere Tagesziele“.'));
}

/** Zutatenliste mit Gramm-Feldern, Entfernen und „+ Zutat“ über den Lebensmittel-Dialog. */
function zutatenEditor(zutaten, lebensmittel, markiereGeaendert, neuZeichnen, titel) {
  const summe = el('p', { class: 'leise klein' });
  const aktualisiereSumme = () => {
    const w = naehrwerteZutaten(zutaten, lebensmittel);
    summe.textContent = zutaten.length
      ? `Zusammen: ${zahl(Math.round(w.kcal ?? 0))} kcal · P ${zahl(w.protein ?? 0)} g · KH ${zahl(w.kh ?? 0)} g · F ${zahl(w.fett ?? 0)} g`
      : 'Noch keine Zutaten.';
  };
  const name = (id) => lebensmittel.find((l) => l.id === id)?.name ?? id;
  aktualisiereSumme();
  return el('div', {},
    ...zutaten.map((z) => el('div', { class: 'aktivitaet' },
      zahlFeld(name(z.lebensmittelId), z.gramm, 'g', (wert) => { z.gramm = wert; aktualisiereSumme(); markiereGeaendert(); }),
      el('button', {
        class: 'knopf-klein',
        type: 'button',
        'aria-label': `${name(z.lebensmittelId)} entfernen`,
        onclick: () => { zutaten.splice(zutaten.indexOf(z), 1); markiereGeaendert(); neuZeichnen(); },
      }, icon('schliessen', 18)))),
    summe,
    el('button', {
      class: 'knopf zweitrangig',
      type: 'button',
      onclick: () => oeffneEintragDialog({
        lebensmittel,
        titel,
        beiSpeichern: (lebensmittelId, gramm) => { zutaten.push({ lebensmittelId, gramm }); markiereGeaendert(); neuZeichnen(); },
      }),
    }, '+ Zutat'));
}

function morningStackKarte(profil, lebensmittel, markiereGeaendert, neuZeichnen) {
  const ms = profil.morningStack;
  return karte(
    schalter(ms.aktiv, (wert) => { ms.aktiv = wert; markiereGeaendert(); }, el('strong', {}, 'Aktiv'), ' – jeden Tag als getrunken vorbelegt'),
    el('p', { class: 'leise klein' }, 'Ein fester Eintrag, den du jeden Tag nimmst (z. B. ein Shake oder Saft am Morgen).'),
    textFeld('Name', ms.name, (wert) => { ms.name = wert; markiereGeaendert(); }),
    zutatenEditor(ms.zutaten, lebensmittel, markiereGeaendert, neuZeichnen, ms.name));
}

/** Eigene Nährwerte pro Portion; leeres Feld = unbekannt. */
function naehrwertEditor(naehrwerte, markiereGeaendert) {
  return el('details', {},
    el('summary', {}, `Nährwerte pro Portion (${Object.keys(naehrwerte).length} eingetragen)`),
    el('div', { class: 'felder' }, ...Object.entries(NAEHRSTOFFE).map(([k, n]) => {
      const eingabe = el('input', {
        type: 'number',
        inputMode: 'decimal',
        min: 0,
        step: 'any',
        value: naehrwerte[k] ?? '',
        oninput: () => {
          if (eingabe.value === '') delete naehrwerte[k];
          else naehrwerte[k] = eingabe.valueAsNumber;
          markiereGeaendert();
        },
      });
      return el('label', { class: 'feld' }, el('span', {}, `${n.name} (${n.einheit})`), eingabe);
    })));
}

function supplementKarte(s, profil, lebensmittel, markiereGeaendert, neuZeichnen) {
  return karte(
    schalter(s.aktiv, (wert) => { s.aktiv = wert; markiereGeaendert(); }, el('strong', {}, s.name || 'Neues Supplement')),
    el('div', { class: 'felder' },
      textFeld('Name', s.name, (wert) => { s.name = wert; markiereGeaendert(); }),
      textFeld('Dosis', s.dosis, (wert) => { s.dosis = wert; markiereGeaendert(); }, 'z. B. 5 g')),
    s.hinweis ? el('p', { class: 'leise klein' }, s.hinweis) : null,
    s.zutaten
      ? zutatenEditor(s.zutaten, lebensmittel, markiereGeaendert, neuZeichnen, s.name)
      : naehrwertEditor(s.naehrwerte ??= {}, markiereGeaendert),
    el('button', {
      class: 'knopf zweitrangig gefahr',
      type: 'button',
      onclick: () => { profil.supplements.splice(profil.supplements.indexOf(s), 1); markiereGeaendert(); neuZeichnen(); },
    }, 'Entfernen'));
}

function supplementHinzufuegen(profil, lebensmittel, neuZeichnen) {
  const neu = (daten) => {
    profil.supplements.push({ id: `s${Date.now().toString(36)}`, name: '', dosis: '', aktiv: true, ...daten });
    neuZeichnen();
  };
  return el('div', { class: 'knopfreihe' },
    el('button', {
      class: 'knopf zweitrangig',
      type: 'button',
      onclick: () => oeffneEintragDialog({
        lebensmittel,
        titel: 'Supplement aus Lebensmittel',
        beiSpeichern: (lebensmittelId, gramm) => neu({
          name: lebensmittel.find((l) => l.id === lebensmittelId)?.name ?? '',
          dosis: `${zahl(gramm)} g`,
          zutaten: [{ lebensmittelId, gramm }],
        }),
      }),
    }, '+ aus Lebensmittel (z. B. Kreatin)'),
    el('button', { class: 'knopf zweitrangig', type: 'button', onclick: () => neu({ naehrwerte: {} }) },
      '+ mit eigenen Nährwerten (z. B. Multivitamin)'));
}

function mahlzeitenKarte(profil, markiereGeaendert) {
  const summe = el('p', { class: 'leise klein' });
  const aktualisiereSumme = () => {
    const s = summeAnteile(profil.mahlzeiten);
    summe.textContent = `Summe: ${zahl(s)} %${s === 100 ? ' ✓' : ' – muss 100 % ergeben'}`;
    summe.classList.toggle('warnung', s !== 100);
  };
  const felder = profil.mahlzeiten.map((m) => zahlFeld(m.name, m.anteil, '%', (wert) => {
    m.anteil = wert;
    aktualisiereSumme();
    markiereGeaendert();
  }));
  aktualisiereSumme();
  return karte(
    el('p', { class: 'leise klein' }, 'Morning Stack und Supplements werden vorher vom Tagesziel abgezogen.'),
    el('div', { class: 'felder' }, ...felder),
    summe);
}
