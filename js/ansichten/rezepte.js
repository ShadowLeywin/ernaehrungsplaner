// Ansicht "Rezepte": Liste, Detail mit Nährwerten je Portion, Formular mit Zutaten und Schritten.
// Jeder Schritt kann ein "Prinzip dahinter" tragen: warum er funktioniert.

import { NAEHRSTOFFE } from '../logik/naehrwerte.js';
import { pruefeRezept, rezeptWerte } from '../logik/rezepte.js';
import { APP_NAME } from '../logik/schema.js';
import { parseZahl } from '../logik/zutat.js';
import { gehe, neuZeichnen } from '../router.js';
import * as speicher from '../speicher.js';
import { bestaetige, el, feld, gramm, haenge, hinweis, icon, zahl } from '../ui.js';
import { oeffneRezeptPortion, waehleZutat } from './eintrag.js';

const adresse = (id, anhang = '') => `#/rezepte/${encodeURIComponent(id)}${anhang}`;
const portionenText = (n) => `${zahl(n, 1)} ${n === 1 ? 'Portion' : 'Portionen'}`;

export async function zeigeRezepte(wurzel, teile) {
  if (teile[0] === 'neu') return formular(wurzel, null);
  if (teile[0]) {
    const rezept = await speicher.holeRezept(teile[0]);
    if (!rezept) return nichtGefunden(wurzel);
    return teile[1] === 'bearbeiten' ? formular(wurzel, rezept) : detail(wurzel, rezept);
  }
  return liste(wurzel);
}

/* ---------- Liste ---------- */

async function liste(wurzel) {
  const rezepte = (await speicher.alleRezepte()).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  document.title = `Rezepte – ${APP_NAME}`;
  haenge(wurzel,
    el('header', { class: 'seitenkopf' },
      el('h1', {}, 'Rezepte'),
      el('a', { class: 'knopf klein', href: '#/rezepte/neu' }, icon('plus', 18), 'Neues Rezept')),
    el('a', { class: 'textlink', href: '#/zutaten' }, 'Zutaten und Mag-Liste'),
    rezepte.length
      ? el('ul', { class: 'zeilen' }, rezepte.map((r) => {
        const w = rezeptWerte(r);
        return el('li', {}, el('a', { class: 'zeile', href: adresse(r.id) },
          el('span', { class: 'zeile-name' }, r.name, el('small', {}, portionenText(r.portionen))),
          el('span', { class: 'zeile-wert' }, `${zahl(w.jePortion.kcal ?? 0)} kcal je Portion`)));
      }))
      : el('p', { class: 'leer' }, 'Noch kein Rezept. Lege eines an, dann trägst du eine Portion mit einem Tipp ins Tagebuch ein.'));
}

/* ---------- Detail ---------- */

function detail(wurzel, rezept) {
  document.title = `${rezept.name} – ${APP_NAME}`;
  const w = rezeptWerte(rezept);
  const zeilen = ['kcal', 'protein', 'kh', 'fett', 'ballaststoffe']
    .filter((id) => typeof w.jePortion[id] === 'number')
    .map((id) => {
      const n = NAEHRSTOFFE.find((x) => x.id === id);
      return el('tr', {}, el('th', { scope: 'row' }, n.name), el('td', {}, `${id === 'kcal' ? zahl(w.jePortion[id]) : gramm(w.jePortion[id])} ${n.einheit}`));
    });

  const loeschen = async () => {
    const ja = await bestaetige({
      titel: 'Rezept löschen?', ja: 'Löschen', gefaehrlich: true,
      text: `„${rezept.name}“ verschwindet aus deiner Liste. Einträge im Tagebuch behalten ihre Werte.`,
    });
    if (!ja) return;
    await speicher.loescheRezept(rezept.id);
    hinweis('Rezept gelöscht.', { aktion: 'Rückgängig', beiAktion: async () => { await speicher.speichereRezept(rezept); neuZeichnen(); } });
    gehe('/rezepte');
  };

  haenge(wurzel,
    el('a', { class: 'zurueck', href: '#/rezepte' }, icon('zurueck', 18), 'Rezepte'),
    el('header', { class: 'detailkopf' },
      el('h1', {}, rezept.name),
      el('p', {}, `${portionenText(rezept.portionen)}, je etwa ${zahl(w.portionGramm)} g ${w.gekocht ? 'gekocht' : 'Rohgewicht'}`),
      rezept.haltbarTage || rezept.einfrierbar ? el('p', { class: 'klein' }, [
        rezept.haltbarTage ? `Hält im Kühlschrank ${rezept.haltbarTage} ${rezept.haltbarTage === 1 ? 'Tag' : 'Tage'}.` : null,
        rezept.einfrierbar ? 'Lässt sich einfrieren.' : null,
      ].filter(Boolean).join(' ')) : null),
    el('div', { class: 'knopfreihe links' },
      el('button', { type: 'button', class: 'knopf', onclick: () => oeffneRezeptPortion({ rezept }) }, 'Portion eintragen')),
    w.unvollstaendig ? el('p', { class: 'merkzettel' }, 'Bei mindestens einer Zutat fehlen Angaben. Die Werte fallen dadurch zu niedrig aus.') : null,
    el('table', { class: 'naehrwerte' }, el('caption', {}, 'Nährwerte je Portion'), el('tbody', {}, zeilen)),
    el('p', { class: 'klein' }, `Je 100 g: ${zahl(w.je100.kcal ?? 0)} kcal. Ganzes Rezept: ${zahl(w.gesamt.kcal ?? 0)} kcal in ${zahl(w.fertigGramm)} g.`),
    el('h2', {}, 'Zutaten'),
    el('ul', { class: 'zeilen' }, rezept.zutaten.map((z) => el('li', { class: 'zeile' },
      el('span', { class: 'zeile-name' }, z.name, z.marke ? el('small', {}, z.marke) : null),
      el('span', { class: 'zeile-wert' }, `${zahl(z.gramm, 1)} g`)))),
    rezept.schritte.length ? el('h2', {}, 'Zubereitung') : null,
    rezept.schritte.length ? el('ol', { class: 'schritte' }, rezept.schritte.map((s) => el('li', {},
      el('p', {}, s.text),
      s.prinzip ? el('div', { class: 'prinzip' }, el('strong', {}, 'Prinzip dahinter'), el('p', {}, s.prinzip)) : null))) : null,
    el('div', { class: 'knopfreihe' },
      el('button', { type: 'button', class: 'knopf leise', onclick: loeschen }, 'Löschen'),
      el('a', { class: 'knopf leise', href: adresse(rezept.id, '/bearbeiten') }, 'Bearbeiten')));
}

function nichtGefunden(wurzel) {
  haenge(wurzel,
    el('a', { class: 'zurueck', href: '#/rezepte' }, icon('zurueck', 18), 'Rezepte'),
    el('p', { class: 'leer' }, 'Dieses Rezept gibt es nicht mehr.'));
}

/* ---------- Formular ---------- */

function formular(wurzel, vorlage) {
  const titel = vorlage ? 'Rezept bearbeiten' : 'Neues Rezept';
  document.title = `${titel} – ${APP_NAME}`;
  const alsText = (wert) => String(wert).replace('.', ',');
  const eingabe = {
    name: vorlage?.name ?? '',
    portionen: vorlage ? alsText(vorlage.portionen) : '4',
    zutaten: (vorlage?.zutaten ?? []).map((z) => ({ ...z, gramm: alsText(z.gramm) })),
    schritte: vorlage?.schritte?.length ? vorlage.schritte.map((s) => ({ text: s.text, prinzip: s.prinzip ?? '' })) : [{ text: '', prinzip: '' }],
    gewichtGekocht: vorlage?.gewichtGekocht ? alsText(vorlage.gewichtGekocht) : '',
    haltbarTage: vorlage?.haltbarTage ? String(vorlage.haltbarTage) : '',
    einfrierbar: Boolean(vorlage?.einfrierbar),
  };
  const summe = el('p', { class: 'klein', id: 'rezept-summe', 'aria-live': 'polite' });

  const zeigeSumme = () => {
    const portionen = parseZahl(eingabe.portionen);
    const w = rezeptWerte({
      portionen: portionen > 0 ? portionen : 1,
      zutaten: eingabe.zutaten.map((z) => ({ ...z, gramm: parseZahl(z.gramm) })).filter((z) => z.gramm > 0),
    });
    summe.textContent = w.gesamtGramm > 0
      ? `Zusammen ${zahl(w.gesamtGramm)} g und ${zahl(w.gesamt.kcal ?? 0)} kcal. Je Portion ${zahl(w.jePortion.kcal ?? 0)} kcal und ${gramm(w.jePortion.protein ?? 0)} g Eiweiß.`
      : '';
  };

  const zeichne = (fehler = {}, fokus = null) => {
    const speichern = async (e) => {
      e.preventDefault();
      const pruefung = pruefeRezept(eingabe);
      if (!pruefung.ok) {
        zeichne(pruefung.fehler);
        const erstes = wurzel.querySelector('.fehlertext');
        erstes?.scrollIntoView({ block: 'center' });
        (erstes?.closest('.feld, .rezeptzeile, .schritt')?.querySelector('input, textarea') ?? erstes)?.focus?.();
        return;
      }
      const gespeichert = await speicher.speichereRezept({ ...(vorlage ? { id: vorlage.id, erstellt: vorlage.erstellt } : {}), ...pruefung.rezept });
      hinweis('Rezept gespeichert.');
      gehe(adresse(gespeichert.id).slice(1));
    };

    const zutatZeile = (z, i) => el('li', { class: 'rezeptzeile' },
      el('span', { class: 'zeile-name' }, z.name, z.marke ? el('small', {}, z.marke) : null),
      el('div', { class: 'eingabe' },
        el('input', {
          inputmode: 'decimal', autocomplete: 'off', value: z.gramm, 'aria-label': `Gramm ${z.name}`, class: 'gramm-eingabe',
          'aria-invalid': fehler.gramm?.[i] ? 'true' : null,
          oninput: (e) => { z.gramm = e.target.value; zeigeSumme(); },
        }),
        el('span', { class: 'einheit' }, 'g')),
      el('button', { type: 'button', class: 'rund', 'aria-label': `${z.name} entfernen`, onclick: () => { eingabe.zutaten.splice(i, 1); zeichne(); } }, icon('zu', 20)),
      fehler.gramm?.[i] ? el('p', { class: 'fehlertext' }, fehler.gramm[i]) : null);

    const schrittBlock = (s, i) => el('li', { class: 'schritt' },
      el('label', { for: `f-schritt-${i}` }, `Schritt ${i + 1}`),
      el('textarea', { id: `f-schritt-${i}`, rows: 2, placeholder: 'Was ist zu tun?', maxlength: 1000, oninput: (e) => { s.text = e.target.value; } }, s.text),
      el('label', { for: `f-prinzip-${i}`, class: 'nebenlabel' }, 'Prinzip dahinter (freiwillig)'),
      el('textarea', { id: `f-prinzip-${i}`, rows: 2, placeholder: 'Warum funktioniert das?', maxlength: 600, oninput: (e) => { s.prinzip = e.target.value; } }, s.prinzip),
      fehler.schritt?.[i] ? el('p', { class: 'fehlertext' }, fehler.schritt[i]) : null,
      eingabe.schritte.length > 1
        ? el('button', { type: 'button', class: 'textlink', onclick: () => { eingabe.schritte.splice(i, 1); zeichne(); } }, `Schritt ${i + 1} entfernen`)
        : null);

    wurzel.replaceChildren(
      el('a', { class: 'zurueck', href: vorlage ? adresse(vorlage.id) : '#/rezepte' }, icon('zurueck', 18), 'Abbrechen'),
      el('h1', {}, titel),
      el('form', { class: 'stapel', novalidate: true, onsubmit: speichern },
        feld({ name: 'name', beschriftung: 'Name', value: eingabe.name, fehler: fehler.name, maxlength: 80, oninput: (e) => { eingabe.name = e.target.value; } }),
        feld({ name: 'portionen', beschriftung: 'Ergibt wie viele Portionen?', inputmode: 'decimal', value: eingabe.portionen, fehler: fehler.portionen, oninput: (e) => { eingabe.portionen = e.target.value; zeigeSumme(); } }),
        el('fieldset', { class: 'gruppe' },
          el('legend', {}, 'Zutaten'),
          eingabe.zutaten.length ? el('ul', { class: 'rezeptzeilen' }, eingabe.zutaten.map(zutatZeile)) : null,
          fehler.zutaten ? el('p', { class: 'fehlertext', role: 'alert' }, fehler.zutaten) : null,
          summe,
          el('button', {
            type: 'button', class: 'knopf leise', onclick: () => waehleZutat({
              beiWahl: (zutat) => {
                eingabe.zutaten.push({ zutatId: zutat.id, name: zutat.name, marke: zutat.marke ?? '', je100: zutat.je100, gramm: '' });
                zeichne({}, 'letzteZutat');
              },
            }),
          }, icon('plus', 18), 'Zutat hinzufügen')),
        el('fieldset', { class: 'gruppe' },
          el('legend', {}, 'Zubereitung'),
          el('p', { class: 'klein' }, 'Das Prinzip erklärt, warum ein Schritt funktioniert. So lernst du beim Kochen mit.'),
          el('ol', { class: 'schritt-liste' }, eingabe.schritte.map(schrittBlock)),
          el('button', { type: 'button', class: 'knopf leise', onclick: () => { eingabe.schritte.push({ text: '', prinzip: '' }); zeichne({}, 'letzterSchritt'); } }, icon('plus', 18), 'Schritt hinzufügen')),
        el('fieldset', { class: 'gruppe' },
          el('legend', {}, 'Vorkochen (freiwillig)'),
          el('p', { class: 'klein' }, 'Wiege den vollen Topf nach dem Kochen und zieh das Gewicht des leeren Topfs ab. Dann stimmen Portionsgewicht und Werte je 100 g.'),
          el('div', { class: 'raster' },
            feld({ name: 'gewichtGekocht', beschriftung: 'Gewicht nach dem Kochen', einheit: 'g', inputmode: 'decimal', value: eingabe.gewichtGekocht, fehler: fehler.gewichtGekocht, oninput: (e) => { eingabe.gewichtGekocht = e.target.value; } }),
            feld({ name: 'haltbarTage', beschriftung: 'Hält im Kühlschrank', einheit: 'Tage', inputmode: 'numeric', value: eingabe.haltbarTage, fehler: fehler.haltbarTage, oninput: (e) => { eingabe.haltbarTage = e.target.value; } })),
          el('label', { class: 'haken-feld' },
            el('input', { type: 'checkbox', id: 'f-einfrierbar', checked: eingabe.einfrierbar ? true : null, onchange: (e) => { eingabe.einfrierbar = e.target.checked; } }),
            'Lässt sich einfrieren')),
        el('div', { class: 'knopfreihe' }, el('button', { type: 'submit', class: 'knopf' }, 'Rezept speichern'))));

    zeigeSumme();
    if (fokus === 'letzteZutat') [...wurzel.querySelectorAll('.gramm-eingabe')].at(-1)?.focus();
    if (fokus === 'letzterSchritt') wurzel.querySelector(`#f-schritt-${eingabe.schritte.length - 1}`)?.focus();
  };
  zeichne();
}
