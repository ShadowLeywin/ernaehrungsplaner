// Ansicht "Zutaten": Liste mit Suche, Detail, eigene Zutat anlegen und ändern, Suche bei Open Food Facts.

import { NAEHRSTOFFE } from '../logik/naehrwerte.js';
import { APP_NAME } from '../logik/schema.js';
import { sucheZutaten } from '../logik/suche.js';
import { FORMULAR_FELDER, KATEGORIEN, QUELLEN, kategorieName, pruefeZutat } from '../logik/zutat.js';
import { sucheOnline } from '../off-abruf.js';
import { gehe, neuZeichnen } from '../router.js';
import * as speicher from '../speicher.js';
import { bestaetige, el, feld, haenge, hinweis, icon, zahl } from '../ui.js';

// Zustand der Liste bleibt beim Wechsel zwischen Liste und Detail erhalten
const zustand = { begriff: '', nurEigene: false, online: null };

const adresse = (id, anhang = '') => `#/zutaten/${encodeURIComponent(id)}${anhang}`;
const istEigen = (zutat) => !String(zutat.id).startsWith('basis:');

export async function zeigeZutaten(wurzel, teile) {
  if (teile[0] === 'neu') return formular(wurzel, teile[1] ? await speicher.holeZutat(teile[1]) : null, true);
  if (teile[0]) {
    const zutat = await speicher.holeZutat(teile[0]);
    if (!zutat) return nichtGefunden(wurzel);
    return teile[1] === 'bearbeiten' && istEigen(zutat) ? formular(wurzel, zutat, false) : detail(wurzel, zutat);
  }
  return liste(wurzel);
}

/* ---------- Liste ---------- */

async function liste(wurzel) {
  const zutaten = await speicher.alleZutaten();
  const eigeneIds = new Set(zutaten.filter(istEigen).map((z) => z.id));
  document.title = `Zutaten – ${APP_NAME}`;

  const treffer = el('div', {});
  const online = el('div', { class: 'online' });

  const zeile = (zutat) => el('li', {}, el('a', { class: 'zeile', href: adresse(zutat.id) },
    el('span', { class: 'zeile-name' }, zutat.name, el('small', {}, zutat.marke || kategorieName(zutat.kategorie))),
    el('span', { class: 'zeile-wert' }, `${zahl(zutat.je100.kcal)} kcal`)));

  const zeichneTreffer = () => {
    const auswahl = zustand.nurEigene ? zutaten.filter(istEigen) : zutaten;
    const gefunden = sucheZutaten(auswahl, zustand.begriff, 200);
    let leer = `Keine Zutat passt zu „${zustand.begriff.trim()}“.`;
    if (!zustand.begriff.trim() && zustand.nurEigene) leer = 'Du hast noch keine eigene Zutat angelegt.';
    treffer.replaceChildren(gefunden.length
      ? el('ul', { class: 'zeilen' }, gefunden.map(zeile))
      : el('p', { class: 'leer' }, leer));
  };

  const zeichneOnline = () => {
    const begriff = zustand.begriff.trim();
    const o = zustand.online;
    if (begriff.length < 2) return online.replaceChildren();
    const kinder = [
      el('button', { type: 'button', class: 'knopf leise', disabled: o?.laedt ? true : null, onclick: sucheStarten },
        o?.laedt ? 'Suche läuft …' : `„${begriff}“ bei Open Food Facts suchen`),
      el('p', { class: 'klein' }, 'Sendet nur diesen Suchbegriff an openfoodfacts.org. Ein Barcode (8 bis 14 Ziffern) funktioniert auch.'),
    ];
    if (o && !o.laedt && o.begriff === begriff) {
      if (o.fehler) kinder.push(el('p', { class: 'fehlertext', role: 'alert' }, o.fehler));
      else if (!o.liste.length) kinder.push(el('p', { class: 'leer' }, 'Open Food Facts kennt dazu kein Produkt mit Nährwerten.'));
      else {
        kinder.push(el('h2', { class: 'zwischentitel' }, 'Treffer bei Open Food Facts'),
          el('ul', { class: 'zeilen' }, o.liste.map((z) => el('li', { class: 'zeile' },
            el('span', { class: 'zeile-name' }, z.name, el('small', {}, [z.marke, `${zahl(z.je100.kcal)} kcal je 100 g`].filter(Boolean).join(', '))),
            eigeneIds.has(z.id)
              ? el('a', { class: 'textlink', href: adresse(z.id) }, 'Gespeichert')
              : el('button', { type: 'button', class: 'chip', onclick: () => uebernimm(z) }, 'Übernehmen')))));
      }
    }
    return online.replaceChildren(...kinder);
  };

  async function sucheStarten() {
    const begriff = zustand.begriff.trim();
    zustand.online = { begriff, laedt: true };
    zeichneOnline();
    try {
      zustand.online = { begriff, liste: await sucheOnline(begriff) };
    } catch (fehler) {
      zustand.online = { begriff, fehler: fehler.message };
    }
    zeichneOnline();
  }

  async function uebernimm(zutat) {
    await speicher.speichereZutat(zutat);
    eigeneIds.add(zutat.id);
    zutaten.unshift(zutat);
    hinweis(`„${zutat.name}“ gespeichert.`);
    zeichneTreffer();
    zeichneOnline();
  }

  const filter = (text, nurEigene) => el('button', {
    type: 'button', class: 'wahl-knopf', 'aria-pressed': String(zustand.nurEigene === nurEigene),
    onclick: () => { zustand.nurEigene = nurEigene; neuZeichnen(); },
  }, text);

  zeichneTreffer();
  zeichneOnline();
  haenge(wurzel, 
    el('header', { class: 'seitenkopf' },
      el('h1', {}, 'Zutaten'),
      el('a', { class: 'knopf klein', href: '#/zutaten/neu' }, icon('plus', 18), 'Neue Zutat')),
    el('input', {
      type: 'search', class: 'suchfeld', placeholder: 'Zutat suchen', 'aria-label': 'Zutat suchen', autocomplete: 'off',
      enterkeyhint: 'search', value: zustand.begriff,
      oninput: (e) => { zustand.begriff = e.target.value; zeichneTreffer(); zeichneOnline(); },
    }),
    el('div', { class: 'wahl schmal', role: 'group', 'aria-label': 'Auswahl' }, filter(`Alle (${zutaten.length})`, false), filter(`Eigene (${eigeneIds.size})`, true)),
    el('p', { class: 'klein' }, 'Werte je 100 g'),
    treffer,
    online);
}

/* ---------- Detail ---------- */

function detail(wurzel, zutat) {
  document.title = `${zutat.name} – ${APP_NAME}`;
  const zeilen = (gruppe) => NAEHRSTOFFE
    .filter((n) => n.gruppe === gruppe && typeof zutat.je100[n.id] === 'number')
    .map((n) => el('tr', { class: n.unter ? 'unterzeile' : null },
      el('th', { scope: 'row' }, n.name),
      el('td', {}, `${zahl(zutat.je100[n.id], n.einheit === 'kcal' ? 0 : 2)} ${n.einheit}`)));
  const mikros = zeilen('mikro');

  const loeschen = async () => {
    const ja = await bestaetige({
      titel: 'Zutat löschen?', ja: 'Löschen', gefaehrlich: true,
      text: `„${zutat.name}“ verschwindet aus deiner Liste. Einträge im Tagebuch behalten ihre Werte.`,
    });
    if (!ja) return;
    await speicher.loescheZutat(zutat.id);
    hinweis('Zutat gelöscht.', { aktion: 'Rückgängig', beiAktion: async () => { await speicher.speichereZutat(zutat); neuZeichnen(); } });
    gehe('/zutaten');
  };

  haenge(wurzel, 
    el('a', { class: 'zurueck', href: '#/zutaten' }, icon('zurueck', 18), 'Zutaten'),
    el('header', { class: 'detailkopf' },
      el('h1', {}, zutat.name),
      el('p', {}, [zutat.marke, kategorieName(zutat.kategorie)].filter(Boolean).join(', ')),
      el('p', { class: 'klein' }, `Quelle: ${QUELLEN[zutat.quelle] ?? 'unbekannt'}`)),
    zutat.unvollstaendig ? el('p', { class: 'merkzettel' }, 'Bei dieser Zutat fehlen Angaben. Summen im Tagebuch fallen dadurch zu niedrig aus.') : null,
    el('table', { class: 'naehrwerte' },
      el('caption', {}, 'Nährwerte je 100 g'),
      el('tbody', {}, zeilen('makro'))),
    mikros.length ? el('details', { class: 'aufklappen' },
      el('summary', {}, `Vitamine und Mineralstoffe (${mikros.length})`),
      el('table', { class: 'naehrwerte' }, el('tbody', {}, mikros))) : null,
    zutat.portionen?.length ? el('p', {}, `Portion: ${zutat.portionen.map((p) => `1 ${p.name} = ${zahl(p.gramm)} g`).join(', ')}`) : null,
    el('div', { class: 'knopfreihe' },
      istEigen(zutat) ? el('button', { type: 'button', class: 'knopf leise', onclick: loeschen }, 'Löschen') : null,
      istEigen(zutat)
        ? el('a', { class: 'knopf', href: adresse(zutat.id, '/bearbeiten') }, 'Bearbeiten')
        : el('a', { class: 'knopf leise', href: `#/zutaten/neu/${encodeURIComponent(zutat.id)}` }, 'Als eigene Zutat kopieren')));
}

function nichtGefunden(wurzel) {
  haenge(wurzel, 
    el('a', { class: 'zurueck', href: '#/zutaten' }, icon('zurueck', 18), 'Zutaten'),
    el('p', { class: 'leer' }, 'Diese Zutat gibt es nicht mehr.'));
}

/* ---------- Formular ---------- */

/** vorlage: Zutat zum Ändern oder Kopieren (oder null). neu: true legt einen neuen Datensatz an. */
function formular(wurzel, vorlage, neu) {
  const titel = neu ? 'Neue Zutat' : 'Zutat bearbeiten';
  document.title = `${titel} – ${APP_NAME}`;
  const alsText = (wert) => (typeof wert === 'number' ? String(wert).replace('.', ',') : '');
  const eingabe = {
    name: vorlage?.name ?? '',
    marke: vorlage?.marke ?? '',
    kategorie: vorlage?.kategorie ?? 'sonstiges',
    portionName: vorlage?.portionen?.[0]?.name ?? '',
    portionGramm: alsText(vorlage?.portionen?.[0]?.gramm),
    je100: Object.fromEntries(FORMULAR_FELDER.map((id) => [id, alsText(vorlage?.je100?.[id])])),
  };
  const zurueck = !neu && vorlage ? adresse(vorlage.id) : '#/zutaten';

  const zeichne = (fehler = {}) => {
    const naehrstoff = (id) => {
      const n = NAEHRSTOFFE.find((x) => x.id === id);
      return feld({
        name: id, beschriftung: n.name, einheit: n.einheit, inputmode: 'decimal', value: eingabe.je100[id], fehler: fehler[id],
        oninput: (e) => { eingabe.je100[id] = e.target.value; },
      });
    };
    const speichern = async (e) => {
      e.preventDefault();
      const pruefung = pruefeZutat(eingabe);
      if (!pruefung.ok) {
        zeichne(pruefung.fehler);
        wurzel.querySelector('[aria-invalid="true"], .fehlertext')?.scrollIntoView({ block: 'center' });
        wurzel.querySelector('[aria-invalid="true"]')?.focus();
        return;
      }
      // Beim Ändern bleiben id, Quelle und die Werte erhalten, die das Formular nicht zeigt (Vitamine …)
      const rest = Object.fromEntries(Object.entries(vorlage?.je100 ?? {}).filter(([id]) => !FORMULAR_FELDER.includes(id)));
      const zutat = { ...pruefung.zutat, je100: { ...rest, ...pruefung.zutat.je100 } };
      if (!neu) Object.assign(zutat, { id: vorlage.id, quelle: vorlage.quelle, quelleId: vorlage.quelleId });
      const gespeichert = await speicher.speichereZutat(zutat);
      hinweis('Zutat gespeichert.');
      gehe(adresse(gespeichert.id).slice(1));
    };

    wurzel.replaceChildren(
      el('a', { class: 'zurueck', href: zurueck }, icon('zurueck', 18), 'Abbrechen'),
      el('h1', {}, titel),
      el('form', { class: 'stapel', novalidate: true, onsubmit: speichern },
        feld({ name: 'name', beschriftung: 'Name', value: eingabe.name, fehler: fehler.name, maxlength: 80, oninput: (e) => { eingabe.name = e.target.value; } }),
        feld({ name: 'marke', beschriftung: 'Marke (freiwillig)', value: eingabe.marke, maxlength: 60, oninput: (e) => { eingabe.marke = e.target.value; } }),
        el('div', { class: 'feld' },
          el('label', { for: 'f-kategorie' }, 'Kategorie'),
          el('select', { id: 'f-kategorie', onchange: (e) => { eingabe.kategorie = e.target.value; } },
            KATEGORIEN.map((k) => el('option', { value: k.id, selected: k.id === eingabe.kategorie }, k.name)))),
        el('fieldset', { class: 'gruppe' },
          el('legend', {}, 'Nährwerte je 100 g'),
          el('p', { class: 'klein' }, 'Trage ein, was auf der Packung steht. Nur die Energie ist Pflicht.'),
          el('div', { class: 'raster' }, FORMULAR_FELDER.map(naehrstoff)),
          fehler.summe ? el('p', { class: 'fehlertext', role: 'alert' }, fehler.summe) : null),
        el('fieldset', { class: 'gruppe' },
          el('legend', {}, 'Portion (freiwillig)'),
          el('div', { class: 'raster' },
            feld({ name: 'portionName', beschriftung: 'Bezeichnung', placeholder: 'Stück, Scheibe, Becher', value: eingabe.portionName, maxlength: 30, oninput: (e) => { eingabe.portionName = e.target.value; } }),
            feld({ name: 'portionGramm', beschriftung: 'Gewicht', einheit: 'g', inputmode: 'decimal', value: eingabe.portionGramm, fehler: fehler.portionGramm, oninput: (e) => { eingabe.portionGramm = e.target.value; } }))),
        el('div', { class: 'knopfreihe' }, el('button', { type: 'submit', class: 'knopf' }, 'Zutat speichern'))));
  };
  zeichne();
}
