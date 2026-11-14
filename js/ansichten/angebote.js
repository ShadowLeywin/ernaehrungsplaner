// Angebote: Übersicht aller Angebote, Eintragen an einer Zutat, Einlesen einer selbst gepflegten Datei.
// Es wird nichts aus fremden Diensten geholt.

import { aktuelleJeZutat, angebotText, giltAm, istAbgelaufen, leseAngebotsDatei, pruefeAngebot } from '../logik/angebote.js';
import { isoDatum } from '../logik/datum.js';
import { APP_NAME } from '../logik/schema.js';
import { neuZeichnen } from '../router.js';
import * as speicher from '../speicher.js';
import { blatt, el, feld, haenge, hinweis, icon } from '../ui.js';

const BEISPIEL = `{
  "schemaVersion": 1,
  "angebote": [
    { "zutat": "Apfel", "markt": "Mein Markt", "preis": 1.99,
      "menge": "1 kg", "gueltigBis": "2026-11-21" }
  ]
}`;

async function entferne(angebot) {
  await speicher.loescheAngebot(angebot.id);
  hinweis('Angebot gelöscht.', { aktion: 'Rückgängig', beiAktion: async () => { await speicher.speichereAngebot(angebot); neuZeichnen(); } });
  neuZeichnen();
}

const angebotZeile = (a, titel) => el('li', { class: 'zeile' },
  el('span', { class: 'zeile-name' }, titel, el('small', {}, [angebotText(a).replace(`${a.markt}: `, ''), a.notiz].filter(Boolean).join(', '))),
  el('button', { type: 'button', class: 'rund', 'aria-label': `Angebot ${titel} löschen`, onclick: () => entferne(a) }, icon('zu', 20)));

/** Abschnitt auf der Seite einer Zutat */
export function angebotBereich(zutat, angebote) {
  const heute = isoDatum();
  const aktuell = aktuelleJeZutat(angebote, heute).get(zutat.id) ?? [];
  return el('section', { class: 'stapel angebot-bereich' },
    el('h2', {}, 'Angebote'),
    aktuell.length
      ? el('ul', { class: 'zeilen' }, aktuell.map((a) => angebotZeile(a, a.markt)))
      : el('p', { class: 'klein' }, 'Kein aktuelles Angebot eingetragen.'),
    el('div', { class: 'knopfreihe links' },
      el('button', { type: 'button', class: 'knopf leise klein', onclick: () => oeffneAngebotFormular(zutat) }, icon('plus', 18), 'Angebot eintragen')));
}

function oeffneAngebotFormular(zutat) {
  const eingabe = { markt: '', preis: '', menge: '', gueltigBis: '', notiz: '' };
  blatt({
    titel: `Angebot für ${zutat.name}`,
    inhalt: (b) => {
      const huelle = el('div', {});
      const zeichne = (fehler = {}) => {
        const f = (name, beschriftung, zusatz = {}) => feld({ name: `angebot-${name}`, beschriftung, value: eingabe[name], fehler: fehler[name], oninput: (e) => { eingabe[name] = e.target.value; }, ...zusatz });
        huelle.replaceChildren(el('form', {
          class: 'stapel', novalidate: true,
          onsubmit: async (e) => {
            e.preventDefault();
            const pruefung = pruefeAngebot(eingabe);
            if (!pruefung.ok) { zeichne(pruefung.fehler); huelle.querySelector('[aria-invalid="true"]')?.focus(); return; }
            await speicher.speichereAngebot({ ...pruefung.angebot, zutatId: zutat.id, zutatName: zutat.name, quelle: 'hand' });
            b.schliessen();
            hinweis('Angebot gespeichert.');
            neuZeichnen();
          },
        },
        f('markt', 'Markt', { maxlength: 40 }),
        el('div', { class: 'raster' }, f('preis', 'Preis', { inputmode: 'decimal', einheit: '€' }), f('menge', 'Wofür?', { placeholder: 'z. B. 500 g', maxlength: 30 })),
        f('gueltigBis', 'Gilt bis (freiwillig)', { type: 'date' }),
        f('notiz', 'Notiz (freiwillig)', { maxlength: 120 }),
        el('div', { class: 'knopfreihe' }, el('button', { type: 'submit', class: 'knopf' }, 'Angebot speichern'))));
      };
      zeichne();
      return huelle;
    },
  });
}

/** Übersicht aller Angebote, erreichbar über die Seite "Woche" */
export async function zeigeAngebote(wurzel) {
  const heute = isoDatum();
  const [angebote, zutaten] = await Promise.all([speicher.alleAngebote(), speicher.alleZutaten()]);
  const aktuell = angebote.filter((a) => giltAm(a, heute)).sort((a, b) => a.markt.localeCompare(b.markt, 'de') || a.zutatName.localeCompare(b.zutatName, 'de'));
  const abgelaufen = angebote.filter((a) => istAbgelaufen(a, heute));
  const kuenftig = angebote.filter((a) => !giltAm(a, heute) && !istAbgelaufen(a, heute));
  document.title = `Angebote – ${APP_NAME}`;

  const maerkte = [];
  for (const a of aktuell) {
    if (maerkte.at(-1)?.markt !== a.markt) maerkte.push({ markt: a.markt, liste: [] });
    maerkte.at(-1).liste.push(a);
  }

  const meldung = el('p', { class: 'klein', id: 'angebote-meldung', role: 'status' });
  const liesDatei = async (e) => {
    const datei = e.target.files?.[0];
    e.target.value = '';
    if (!datei) return;
    let ergebnis;
    try { ergebnis = leseAngebotsDatei(JSON.parse(await datei.text()), zutaten); } catch { ergebnis = { ok: false, fehler: ['Die Datei ist kein gültiges JSON.'] }; }
    if (!ergebnis.ok) { meldung.className = 'fehlertext'; meldung.textContent = ergebnis.fehler.join(' '); return; }
    await speicher.ersetzeDateiAngebote(ergebnis.angebote);
    hinweis([
      `${ergebnis.angebote.length} ${ergebnis.angebote.length === 1 ? 'Angebot' : 'Angebote'} eingelesen.`,
      ergebnis.ohneTreffer.length ? `Nicht zugeordnet: ${ergebnis.ohneTreffer.join(', ')}.` : null,
      ergebnis.ungueltig ? `${ergebnis.ungueltig} ${ergebnis.ungueltig === 1 ? 'Zeile' : 'Zeilen'} ungültig.` : null,
    ].filter(Boolean).join(' '));
    neuZeichnen();
  };

  haenge(wurzel,
    el('a', { class: 'zurueck', href: '#/woche' }, icon('zurueck', 18), 'Woche'),
    el('header', { class: 'detailkopf' },
      el('h1', {}, 'Angebote'),
      el('p', {}, 'Angebote trägst du an einer Zutat ein oder liest sie aus einer eigenen Datei ein. Aktuelle Angebote stehen bei der Zutat und in der Einkaufsliste.')),
    aktuell.length === 0 ? el('p', { class: 'leer' }, 'Kein aktuelles Angebot. Öffne eine Zutat und tippe auf „Angebot eintragen“.') : null,
    maerkte.map((m) => [el('h2', {}, m.markt), el('ul', { class: 'zeilen' }, m.liste.map((a) => angebotZeile(a, a.zutatName)))]),
    kuenftig.length ? el('details', { class: 'aufklappen' }, el('summary', {}, `Gilt erst später (${kuenftig.length})`), el('ul', { class: 'zeilen' }, kuenftig.map((a) => angebotZeile(a, `${a.zutatName}, ${a.markt}`)))) : null,
    abgelaufen.length ? el('details', { class: 'aufklappen', id: 'angebote-abgelaufen' },
      el('summary', {}, `Abgelaufen (${abgelaufen.length})`),
      el('ul', { class: 'zeilen' }, abgelaufen.map((a) => angebotZeile(a, `${a.zutatName}, ${a.markt}`))),
      el('div', { class: 'knopfreihe' }, el('button', {
        type: 'button', class: 'knopf leise', onclick: async () => {
          for (const a of abgelaufen) await speicher.loescheAngebot(a.id);
          hinweis(`${abgelaufen.length} abgelaufene gelöscht.`);
          neuZeichnen();
        },
      }, 'Abgelaufene löschen'))) : null,
    el('section', { class: 'bereich' },
      el('h2', {}, 'Aus einer Datei einlesen'),
      el('p', { class: 'klein' }, 'Eine eingelesene Datei ersetzt die Angebote der vorigen Datei. Von Hand eingetragene bleiben.'),
      meldung,
      el('div', { class: 'knopfreihe' },
        el('label', { class: 'knopf leise', for: 'f-angebote-datei' }, 'Angebotsdatei einlesen'),
        el('input', { type: 'file', accept: 'application/json,.json', class: 'unsichtbar', id: 'f-angebote-datei', onchange: liesDatei })),
      el('details', { class: 'aufklappen' }, el('summary', {}, 'So sieht die Datei aus'),
        el('pre', { class: 'beispiel' }, BEISPIEL),
        el('p', { class: 'klein' }, '„zutat“ ist der Name einer Zutat aus deiner Liste. Pflicht sind „zutat“, „markt“ und „preis“.'))));
}
