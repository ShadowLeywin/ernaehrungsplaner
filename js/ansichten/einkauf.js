// Einkaufsliste für einen Zeitraum: eine Woche, einen Monat oder frei gewählt (höchstens 62 Tage).
// Sie wird bei jedem Öffnen aus dem Plan berechnet; gespeichert sind nur die Häkchen und die von Hand
// ergänzten Posten, und zwar je Zeitraum (Schlüssel "<von>..<bis>").

import { aktuelleJeZutat, angebotText } from '../logik/angebote.js';
import { formatTag, formatZeitraum, isoDatum, istGueltig, tageZwischen, verschiebe } from '../logik/datum.js';
import { einkaufsliste, listeAlsText, mengeText } from '../logik/plan.js';
import { APP_NAME } from '../logik/schema.js';
import { MAX_TAGE, freierZeitraum, monatUm, monatsName, verschiebeMonat, wocheUm, zeitraumSchluessel } from '../logik/zeitraum.js';
import { kategorieName } from '../logik/zutat.js';
import { teileText, tippGefuehl } from '../plattform.js';
import { gehe, neuZeichnen } from '../router.js';
import * as speicher from '../speicher.js';
import { el, haenge, hinweis, icon } from '../ui.js';

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
  const [posten, rezepte, zutaten, gespeichert, angebote] = await Promise.all([
    speicher.planZwischen(z.von, z.bis), speicher.alleRezepte(), speicher.alleZutaten(), speicher.einkaufImZeitraum(listenSchluessel), speicher.alleAngebote(),
  ]);
  // Je Zutat das günstigste Angebot, das heute gilt
  const guenstig = aktuelleJeZutat(angebote, isoDatum());
  const angebotHinweis = (schluessel) => (guenstig.has(schluessel) ? `Angebot ${angebotText(guenstig.get(schluessel)[0])}` : null);
  const liste = einkaufsliste(posten, new Map(rezepte.map((r) => [r.id, r])), new Map(zutaten.map((x) => [x.id, x])));
  const erledigt = new Set(gespeichert.filter((s) => s.schluessel && s.erledigt).map((s) => s.schluessel));
  const eigene = gespeichert.filter((s) => s.eigen).sort((a, b) => String(a.erstellt).localeCompare(String(b.erstellt)));
  const tageMitPlan = new Set(posten.map((p) => p.datum)).size;
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
  const zeile = ({ id, name, klein, menge, an, beiWechsel, beiEntfernen }) => el('li', { class: an ? 'haken erledigt' : 'haken' },
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

  const neuerPosten = el('input', { id: 'f-eigener-posten', 'aria-label': 'Eigener Posten', placeholder: 'Noch etwas? Zum Beispiel Spülmittel', maxlength: 80, autocomplete: 'off', enterkeyhint: 'done' });
  const ergaenze = async (e) => {
    e.preventDefault();
    const name = neuerPosten.value.trim();
    if (!name) { neuerPosten.focus(); return; }
    await speicher.speichereEinkauf({ zeitraum: listenSchluessel, eigen: true, name, erledigt: false, erstellt: new Date().toISOString() });
    neuZeichnen();
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
    liste.length === 0 && eigene.length === 0 ? el('p', { class: 'leer' }, 'Die Liste ist leer. Plane Mahlzeiten in diesem Zeitraum, dann stehen die Zutaten hier.') : null,
    gruppen.map((g) => [
      el('h2', {}, kategorieName(g.kategorie)),
      el('ul', { class: 'zeilen' }, g.posten.map((p) => zeile({
        id: `haken-${p.schluessel}`, name: p.name, klein: [p.marke, angebotHinweis(p.schluessel)].filter(Boolean).join(', '), an: erledigt.has(p.schluessel),
        menge: p.stueck ? `${mengeText(p.gramm)}, etwa ${p.stueck} Stück` : mengeText(p.gramm),
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
