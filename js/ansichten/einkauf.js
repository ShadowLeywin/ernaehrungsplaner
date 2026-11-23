// Einkaufsliste für einen Zeitraum: eine Woche, einen Monat oder frei gewählt (höchstens 62 Tage).
// Sie wird bei jedem Öffnen aus dem Plan berechnet; gespeichert sind nur die Häkchen und die von Hand
// ergänzten Posten, und zwar je Zeitraum (Schlüssel "<von>..<bis>").

import { aktuelleJeZutat, angebotText } from '../logik/angebote.js';
import { formatTag, formatZeitraum, isoDatum, istGueltig, tageZwischen, verschiebe } from '../logik/datum.js';
import { einkaufsliste, listeAlsText, mengeText } from '../logik/plan.js';
import { APP_NAME } from '../logik/schema.js';
import { euroText, listenPreis, preisId, preisText, pruefePreis, vergleicheMaerkte } from '../logik/preise.js';
import { MAX_TAGE, freierZeitraum, monatUm, monatsName, verschiebeMonat, wocheUm, zeitraumSchluessel } from '../logik/zeitraum.js';
import { kategorieName } from '../logik/zutat.js';
import { teileText, tippGefuehl } from '../plattform.js';
import { gehe, neuZeichnen } from '../router.js';
import * as speicher from '../speicher.js';
import { blatt, el, haenge, hinweis, icon } from '../ui.js';

// Getipptes im Feld „Noch etwas?“ übersteht ein Neuzeichnen (z. B. nach der Wahl eines anderen Markts)
const entwurf = { posten: '' };

const adresse = ({ von, bis }) => `/einkauf/${von}/${bis}`;

/** Überschrift unter dem Titel: "November 2026", "23. bis 29. November" oder dazu die Zahl der Tage */
function zeitraumText(z) {
  if (z.art === 'monat') return monatsName(z.von.slice(0, 7));
  if (z.von === z.bis) return formatTag(z.von);
  const text = formatZeitraum(z.von, z.bis);
  return z.art === 'woche' ? text : `${text} (${tageZwischen(z.von, z.bis) + 1} Tage)`;
}

/** Der gleich lange Zeitraum davor oder danach; ein Monat blättert zum ganzen Nachbarmonat */
function nachbar(z, richtung) {
  if (z.art === 'monat') return monatUm(`${verschiebeMonat(z.von.slice(0, 7), richtung)}-01`);
  const laenge = tageZwischen(z.von, z.bis) + 1;
  return { art: z.art, von: verschiebe(z.von, richtung * laenge), bis: verschiebe(z.bis, richtung * laenge) };
}

/** Zeitraum aus der Adresse lesen; ohne oder mit ungültiger Angabe gilt die aktuelle Woche */
export function zeitraumAusAdresse(teile, heute = isoDatum()) {
  if (istGueltig(teile[0]) && istGueltig(teile[1])) {
    const frei = freierZeitraum(teile[0], teile[1]);
    if (frei.ok) return frei.zeitraum;
  }
  return wocheUm(istGueltig(teile[0]) ? teile[0] : heute);
}

export async function zeigeEinkauf(wurzel, teile) {
  const z = zeitraumAusAdresse(teile);
  const listenSchluessel = zeitraumSchluessel(z);
  const [posten, rezepte, zutaten, gespeichert, angebote, maerkte, preise, gewaehlt] = await Promise.all([
    speicher.planZwischen(z.von, z.bis), speicher.alleRezepte(), speicher.alleZutaten(), speicher.einkaufImZeitraum(listenSchluessel), speicher.alleAngebote(),
    speicher.alleMaerkte(), speicher.allePreise(), speicher.einstellung('einkaufMarkt'),
  ]);
  maerkte.sort((a, b) => a.name.localeCompare(b.name, 'de'));
  // Preise gelten für einen gewählten Markt; ohne Wahl der erste der Liste
  const markt = maerkte.find((m) => m.id === gewaehlt) ?? maerkte[0] ?? null;
  const preisDaten = { angebote, preise, tag: isoDatum() };
  // Je Zutat das günstigste Angebot, das heute gilt
  const guenstig = aktuelleJeZutat(angebote, isoDatum());
  const angebotHinweis = (schluessel) => (guenstig.has(schluessel) ? `Angebot ${angebotText(guenstig.get(schluessel)[0])}` : null);
  const liste = einkaufsliste(posten, new Map(rezepte.map((r) => [r.id, r])), new Map(zutaten.map((x) => [x.id, x])));
  const erledigt = new Set(gespeichert.filter((s) => s.schluessel && s.erledigt).map((s) => s.schluessel));
  const eigene = gespeichert.filter((s) => s.eigen).sort((a, b) => String(a.erstellt).localeCompare(String(b.erstellt)));
  const tageMitPlan = new Set(posten.map((p) => p.datum)).size;
  const preisListe = markt ? listenPreis(liste, markt, preisDaten) : null;
  document.title = `Einkaufsliste – ${APP_NAME}`;

  // Ein Häkchen ändert nur seine Zeile und den Zähler. Würde die ganze Liste neu gezeichnet,
  // ginge verloren, was gerade im Feld "Noch etwas?" getippt wird.
  const stand = el('p', { class: 'klein', id: 'einkauf-stand' });
  const zeigeStand = () => {
    const gesamt = liste.length + eigene.length;
    const fertig = liste.filter((p) => erledigt.has(p.schluessel)).length + eigene.filter((x) => x.erledigt).length;
    stand.textContent = gesamt ? `${fertig} von ${gesamt} erledigt` : '';
  };
  const hake = async (schluessel, an) => {
    const id = `${listenSchluessel}|${schluessel}`;
    if (an) { erledigt.add(schluessel); await speicher.speichereEinkauf({ id, zeitraum: listenSchluessel, schluessel, erledigt: true }); }
    else { erledigt.delete(schluessel); await speicher.loescheEinkauf(id); }
  };
  const zeile = ({ id, name, klein, menge, an, beiWechsel, beiEntfernen, preis }) => el('li', { class: an ? 'haken erledigt' : 'haken' },
    el('label', {},
      el('input', {
        type: 'checkbox', id, checked: an ? true : null,
        onchange: async (e) => {
          if (e.target.checked) tippGefuehl();
          e.target.closest('.haken').classList.toggle('erledigt', e.target.checked);
          await beiWechsel(e.target.checked);
          zeigeStand();
        },
      }),
      el('span', { class: 'zeile-name' }, name, klein ? el('small', {}, klein) : null)),
    menge ? el('span', { class: 'zeile-wert' }, menge) : null,
    preis ?? null,
    beiEntfernen ? el('button', { type: 'button', class: 'rund', 'aria-label': `${name} entfernen`, onclick: beiEntfernen }, icon('zu', 20)) : null);

  // Nach Kategorie gruppieren: so liegt zusammen, was im Markt zusammen steht
  const gruppen = [];
  for (const p of liste) {
    if (gruppen.at(-1)?.kategorie !== p.kategorie) gruppen.push({ kategorie: p.kategorie, posten: [] });
    gruppen.at(-1).posten.push(p);
  }

  const teilen = async () => {
    try {
      if ((await teileText(listeAlsText(liste, eigene, erledigt, `Einkauf ${zeitraumText(z)}`), 'Einkaufsliste')) === 'kopiert') hinweis('Liste kopiert.');
    } catch {
      hinweis('Teilen hat nicht geklappt.');
    }
  };

  const neuerPosten = el('input', { id: 'f-eigener-posten', 'aria-label': 'Eigener Posten', placeholder: 'Noch etwas? Zum Beispiel Spülmittel', maxlength: 80, autocomplete: 'off', enterkeyhint: 'done', value: entwurf.posten, oninput: (e) => { entwurf.posten = e.target.value; } });
  const ergaenze = async (e) => {
    e.preventDefault();
    const name = neuerPosten.value.trim();
    if (!name) { neuerPosten.focus(); return; }
    await speicher.speichereEinkauf({ zeitraum: listenSchluessel, eigen: true, name, erledigt: false, erstellt: new Date().toISOString() });
    entwurf.posten = '';
    neuZeichnen();
  };

  /* ---------- Preise je Markt (P3) ---------- */

  // Unter dem Namen: Marke, Preis im gewählten Markt, und ein Angebot anderswo, falls es eines gibt
  const mengeTextFuer = (p) => (p.stueck ? `${mengeText(p.gramm)}, etwa ${p.stueck} Stück` : mengeText(p.gramm));
  const kleinText = (p) => {
    const e = preisListe?.je.get(p.schluessel);
    const teile = [markt ? mengeTextFuer(p) : null, p.marke];
    if (e && e.betrag !== null) teile.push(preisText(e, { kurz: true }));
    if (!e || e.quelle !== 'angebot') teile.push(angebotHinweis(p.schluessel));
    return teile.filter(Boolean).join(', ');
  };

  const oeffnePreis = (p) => {
    const e = preisListe.je.get(p.schluessel);
    const alt = preise.find((x) => x.id === preisId(p.schluessel, markt.id));
    const preisFeld = el('input', { id: 'f-preis-euro', inputmode: 'decimal', autocomplete: 'off', value: alt ? String(alt.preis).replace('.', ',') : '' });
    const packungFeld = el('input', { id: 'f-preis-packung', inputmode: 'decimal', autocomplete: 'off', value: String(alt?.packungGramm ?? e?.packungGramm ?? '').replace('.', ',') });
    const fehlerText = el('p', { class: 'fehlertext', role: 'alert' });
    const b = blatt({
      titel: `${p.name} bei ${markt.name}`,
      inhalt: el('form', {
        class: 'stapel', novalidate: true,
        onsubmit: async (ev) => {
          ev.preventDefault();
          const pruefung = pruefePreis({ preis: preisFeld.value, packung: packungFeld.value });
          if (!pruefung.ok) { fehlerText.textContent = pruefung.fehler.preis ?? pruefung.fehler.packung; return; }
          await speicher.speicherePreis({ id: preisId(p.schluessel, markt.id), zutatId: p.schluessel, marktId: markt.id, ...pruefung.wert, datum: isoDatum() });
          b.schliessen();
          hinweis(`Preis für ${p.name} gemerkt.`);
          neuZeichnen();
        },
      },
      el('p', { class: 'klein' }, e?.quelle === 'angebot' ? `Gerade gilt ein Angebot: ${preisText(e)}. Ein gemerkter Preis zählt, wenn kein Angebot gilt.` : 'Was kostet eine Packung? Elan rechnet daraus ganze Packungen für die Menge auf der Liste.'),
      el('div', { class: 'feld' }, el('label', { for: 'f-preis-euro' }, 'Preis je Packung (€)'), preisFeld),
      el('div', { class: 'feld' }, el('label', { for: 'f-preis-packung' }, 'Packung (g oder ml)'), packungFeld),
      fehlerText,
      el('div', { class: 'knopfreihe' },
        alt ? el('button', { type: 'button', class: 'knopf leise', onclick: async () => { await speicher.loeschePreis(alt.id); b.schliessen(); neuZeichnen(); } }, 'Vergessen') : null,
        el('button', { type: 'submit', class: 'knopf' }, 'Merken'))),
    });
  };

  // Rechts in der Zeile: Betrag im gewählten Markt, oder „€ ?“ zum Eintragen
  const preisKnopf = (p) => {
    if (!markt) return null;
    const e = preisListe.je.get(p.schluessel);
    return el('button', {
      type: 'button', class: e.betrag === null ? 'preis-knopf offen' : `preis-knopf ${e.quelle}`,
      'aria-label': e.betrag === null ? `Preis für ${p.name} bei ${markt.name} eintragen` : `${p.name} bei ${markt.name}: ${euroText(e.betrag)}, ändern`,
      onclick: () => oeffnePreis(p),
    }, e.betrag === null ? '€ ?' : euroText(e.betrag));
  };

  const oeffneVergleich = () => {
    const vergleich = vergleicheMaerkte(liste, maerkte, preisDaten);
    blatt({
      titel: 'Märkte vergleichen',
      inhalt: el('div', { class: 'stapel' },
        el('p', { class: 'klein' }, 'Grober Preis dieser Liste je Markt: Angebote, sonst deine gemerkten Preise. Posten ohne Preis zählen nicht mit; deshalb steht zuerst, wo die meisten Preise bekannt sind.'),
        el('ul', { class: 'zeilen', id: 'markt-vergleich' }, vergleich.map((v) => el('li', { class: 'zeile' },
          el('span', { class: 'zeile-name' }, v.markt.name, el('small', {}, `${v.mitPreis} von ${v.gesamt} Posten mit Preis`)),
          el('span', { class: 'zeile-wert' }, v.mitPreis ? euroText(v.summe) : 'unbekannt'))))),
    });
  };

  const preisKarte = () => {
    // Ohne Markt kein Preis; der Weg dahin ist der Knopf „Märkte“ unten auf der Seite
    if (!markt) return el('p', { class: 'klein' }, 'Grober Preis je Markt: Wähle unten unter „Märkte“, wo du einkaufst.');
    const wahl = el('select', {
      id: 'f-einkauf-markt', 'aria-label': 'Markt für die Preise',
      onchange: async (ev) => { await speicher.setzeEinstellung('einkaufMarkt', ev.target.value); neuZeichnen(); },
    }, maerkte.map((m) => el('option', { value: m.id, selected: m.id === markt.id ? true : null }, m.name)));
    return el('section', { class: 'karte preiskarte', 'aria-label': 'Preis der Liste' },
      el('div', { class: 'feld' }, el('label', { for: 'f-einkauf-markt' }, 'Preise bei'), wahl),
      el('p', { class: 'preis-summe', id: 'einkauf-preis' },
        preisListe.mitPreis ? `Grob ${euroText(preisListe.summe)}` : 'Preis noch unbekannt',
        el('small', {}, `${preisListe.mitPreis} von ${preisListe.gesamt} Posten mit Preis`)),
      maerkte.length > 1 ? el('button', { type: 'button', class: 'knopf leise', onclick: oeffneVergleich }, 'Märkte vergleichen') : null);
  };

  // Zeitraum wählen: Woche und Monat rund um den Anfang des jetzigen Zeitraums, oder frei mit zwei Tagen
  const freiFehler = el('p', { class: 'fehlertext', id: 'f-zeitraum-fehler', role: 'alert' });
  const freiVon = el('input', { type: 'date', id: 'f-zeitraum-von', value: z.von, 'aria-describedby': 'f-zeitraum-fehler' });
  const freiBis = el('input', { type: 'date', id: 'f-zeitraum-bis', value: z.bis, 'aria-describedby': 'f-zeitraum-fehler' });
  const freiForm = el('form', {
    class: 'zeitraum-frei', hidden: z.art === 'frei' ? null : true,
    onsubmit: (e) => {
      e.preventDefault();
      const pruefung = freierZeitraum(freiVon.value, freiBis.value);
      if (!pruefung.ok) { freiFehler.textContent = pruefung.fehler; return; }
      gehe(adresse(pruefung.zeitraum));
    },
  },
  el('div', { class: 'feld' }, el('label', { for: 'f-zeitraum-von' }, 'Von'), freiVon),
  el('div', { class: 'feld' }, el('label', { for: 'f-zeitraum-bis' }, 'Bis'), freiBis),
  el('button', { type: 'submit', class: 'knopf' }, 'Zeigen'),
  freiFehler);

  const wahl = [
    { art: 'woche', name: 'Woche', ziel: () => gehe(adresse(wocheUm(z.von))) },
    { art: 'monat', name: 'Monat', ziel: () => gehe(adresse(monatUm(z.von))) },
    { art: 'frei', name: 'Frei', ziel: () => { freiForm.hidden = false; freiVon.focus(); } },
  ];

  const gesamt = liste.length + eigene.length;
  zeigeStand();
  const davor = nachbar(z, -1);
  const danach = nachbar(z, 1);

  haenge(wurzel,
    el('a', { class: 'zurueck', href: `#/woche/${z.von}` }, icon('zurueck', 18), 'Plan'),
    el('header', { class: 'tageskopf' },
      el('div', { class: 'tagestitel' },
        el('p', { class: 'ueberzeile' }, zeitraumText(z)),
        el('h1', {}, 'Einkaufsliste')),
      el('div', { class: 'blaettern' },
        el('a', { class: 'rund', href: `#${adresse(davor)}`, 'aria-label': 'Zeitraum davor' }, icon('zurueck')),
        el('a', { class: 'rund', href: `#${adresse(danach)}`, 'aria-label': 'Zeitraum danach' }, icon('vor')))),
    el('div', { class: 'wahl schmal-voll', role: 'group', 'aria-label': 'Zeitraum der Liste' }, wahl.map((w) => el('button', {
      type: 'button', class: 'wahl-knopf', 'aria-pressed': String(w.art === z.art), onclick: w.ziel,
    }, w.name))),
    freiForm,
    el('p', { class: 'klein' }, [
      tageMitPlan ? `Aus ${tageMitPlan} ${tageMitPlan === 1 ? 'Tag' : 'Tagen'} mit Plan.` : null,
      z.art === 'frei' ? `Frei wählbar bis ${MAX_TAGE} Tage.` : null,
    ].filter(Boolean).join(' ')),
    gesamt ? stand : null,
    liste.length ? preisKarte() : null,
    liste.length === 0 && eigene.length === 0 ? el('p', { class: 'leer' }, 'Die Liste ist leer. Plane Mahlzeiten in diesem Zeitraum, dann stehen die Zutaten hier.') : null,
    gruppen.map((g) => [
      el('h2', {}, kategorieName(g.kategorie)),
      el('ul', { class: 'zeilen' }, g.posten.map((p) => zeile({
        id: `haken-${p.schluessel}`, name: p.name, klein: kleinText(p), an: erledigt.has(p.schluessel), preis: preisKnopf(p),
        // Mit Preis-Knopf rechts wäre die Zeile zu voll: die Menge rückt dann in die kleine Zeile unter den Namen
        menge: markt ? null : mengeTextFuer(p),
        beiWechsel: (an) => hake(p.schluessel, an),
      }))),
    ]),
    eigene.length ? el('h2', {}, 'Eigene Posten') : null,
    eigene.length ? el('ul', { class: 'zeilen' }, eigene.map((x) => zeile({
      id: `haken-${x.id}`, name: x.name, an: x.erledigt,
      beiWechsel: async (an) => { x.erledigt = an; await speicher.speichereEinkauf(x); },
      beiEntfernen: async () => { await speicher.loescheEinkauf(x.id); neuZeichnen(); },
    }))) : null,
    el('form', { class: 'zusatz', onsubmit: ergaenze }, neuerPosten, el('button', { type: 'submit', class: 'knopf leise' }, 'Dazu')),
    el('div', { class: 'knopfreihe' },
      el('a', { class: 'knopf leise', href: '#/maerkte' }, 'Märkte'),
      gesamt ? el('button', { type: 'button', class: 'knopf leise', onclick: teilen }, 'Offene Posten teilen') : null));
}
