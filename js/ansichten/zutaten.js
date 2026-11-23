// Ansicht "Zutaten": Liste mit Suche, Detail, eigene Zutat anlegen und ändern, Suche bei Open Food Facts.

import { NAEHRSTOFFE } from '../logik/naehrwerte.js';
import { APP_NAME } from '../logik/schema.js';
import { zuletztVerwendet } from '../logik/suche.js';
import { ergaenzePortion, naehrwertZeilen, pruefePortion, schalteFavorit, zutatenAuswahl } from '../logik/zutatenbank.js';
import { MAG, istObstGemuese } from '../logik/vorlieben.js';
import { FORMULAR_FELDER, KATEGORIEN, QUELLEN, kategorieName, pruefeZutat } from '../logik/zutat.js';
import { sucheOnline } from '../off-abruf.js';
import { gehe, neuZeichnen } from '../router.js';
import * as speicher from '../speicher.js';
import { bestaetige, el, feld, haenge, hinweis, icon, zahl } from '../ui.js';
import { angebotBereich } from './angebote.js';
import { scanneZutat } from './scanner.js';
import { zeigeMagListe } from './magliste.js';

// Zustand der Liste bleibt beim Wechsel zwischen Liste und Detail erhalten
const zustand = { begriff: '', filter: 'alle', kategorie: null, online: null };

const adresse = (id, anhang = '') => `#/zutaten/${encodeURIComponent(id)}${anhang}`;
const istEigen = (zutat) => !String(zutat.id).startsWith('basis:');

export async function zeigeZutaten(wurzel, teile) {
  if (teile[0] === 'mag') return zeigeMagListe(wurzel);
  if (teile[0] === 'neu') return formular(wurzel, teile[1] ? await speicher.holeZutat(teile[1]) : null, true);
  if (teile[0]) {
    const zutat = await speicher.holeZutat(teile[0]);
    if (!zutat) return nichtGefunden(wurzel);
    if (teile[1] === 'bearbeiten' && istEigen(zutat)) return formular(wurzel, zutat, false);
    const [vorlieben, angebote, favoriten] = await Promise.all([speicher.alleVorlieben(), speicher.alleAngebote(), speicher.ladeFavoriten()]);
    return detail(wurzel, zutat, istObstGemuese(zutat) ? vorlieben.get(zutat.id) : null, angebote, favoriten);
  }
  return liste(wurzel);
}

/* ---------- Umschalter Rezepte | Lebensmittel ---------- */

/**
 * Oben auf „Rezepte“ und „Lebensmittel“: zwei Reiter wie in großen Ernährungs-Apps.
 * Vorher führte nur ein kleiner Textlink zu den Zutaten; Léon fand ihn nicht (23.11.2026).
 */
export function essenWahl(aktiv) {
  return el('nav', { class: 'wahl schmal-voll essen-wahl', 'aria-label': 'Rezepte oder Lebensmittel' },
    [['rezepte', 'Rezepte', '#/rezepte'], ['zutaten', 'Lebensmittel', '#/zutaten']].map(([id, name, href]) => el('a', {
      class: 'wahl-knopf', href, 'aria-current': id === aktiv ? 'page' : null,
    }, name)));
}

/* ---------- Liste ---------- */

async function liste(wurzel) {
  const [zutaten, favoriten, eintraege] = await Promise.all([speicher.alleZutaten(), speicher.ladeFavoriten(), speicher.alleEintraege()]);
  const eigeneIds = new Set(zutaten.filter(istEigen).map((z) => z.id));
  const favSet = new Set(favoriten);
  const nachId = new Map(zutaten.map((z) => [z.id, z]));
  const zuletzt = zuletztVerwendet(eintraege, 6).map((id) => nachId.get(id)).filter(Boolean);
  document.title = `Zutaten – ${APP_NAME}`;

  const treffer = el('div', {});
  const online = el('div', { class: 'online' });

  const zeile = (zutat) => el('li', {}, el('a', { class: 'zeile', href: adresse(zutat.id) },
    el('span', { class: 'zeile-name' }, favSet.has(zutat.id) ? el('span', { class: 'stern-klein', 'aria-label': 'Favorit' }, '★ ') : null, zutat.name, el('small', {}, zutat.marke || kategorieName(zutat.kategorie))),
    el('span', { class: 'zeile-wert' }, `${zahl(zutat.je100.kcal)} kcal`)));

  const zeichneTreffer = () => {
    const gefunden = zutatenAuswahl(zutaten, { begriff: zustand.begriff, filter: zustand.filter, kategorie: zustand.kategorie, favoriten, istEigen });
    let leer = `Keine Zutat passt zu „${zustand.begriff.trim()}“.`;
    if (!zustand.begriff.trim() && zustand.filter === 'eigene') leer = 'Du hast noch keine eigene Zutat angelegt.';
    if (!zustand.begriff.trim() && zustand.filter === 'favoriten') leer = 'Noch keine Favoriten. Öffne eine Zutat und tippe auf den Stern.';
    // Ohne Suche und Filter: was du zuletzt gegessen hast, steht oben
    const zeigeZuletzt = !zustand.begriff.trim() && zustand.filter === 'alle' && !zustand.kategorie && zuletzt.length > 0;
    treffer.replaceChildren(
      zeigeZuletzt ? el('h2', { class: 'zwischentitel' }, 'Zuletzt verwendet') : '',
      zeigeZuletzt ? el('ul', { class: 'zeilen', id: 'zutaten-zuletzt' }, zuletzt.map(zeile)) : '',
      zeigeZuletzt ? el('h2', { class: 'zwischentitel' }, 'Alle Zutaten') : '',
      gefunden.length ? el('ul', { class: 'zeilen', id: 'zutaten-liste' }, gefunden.map(zeile)) : el('p', { class: 'leer' }, leer));
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

  const filter = (text, wert) => el('button', {
    type: 'button', class: 'wahl-knopf', 'aria-pressed': String(zustand.filter === wert),
    onclick: () => { zustand.filter = wert; neuZeichnen(); },
  }, text);
  // Kategorie als Auswahlfeld: Die runden Chips sahen aus wie Überschriften (Léon, 23.11.2026)
  const kategorien = el('div', { class: 'feld kategorie-feld' },
    el('label', { for: 'f-zutat-kategorie' }, 'Kategorie'),
    el('select', {
      id: 'f-zutat-kategorie',
      onchange: (e) => { zustand.kategorie = e.target.value || null; zeichneTreffer(); },
    }, el('option', { value: '' }, 'Alle Kategorien'), KATEGORIEN.map((k) => el('option', { value: k.id, selected: zustand.kategorie === k.id ? true : null }, k.name))));
  const scanne = async () => { const zutat = await scanneZutat(); if (zutat) gehe(adresse(zutat.id).slice(1)); };

  zeichneTreffer();
  zeichneOnline();
  haenge(wurzel, 
    el('header', { class: 'seitenkopf' },
      el('h1', {}, 'Lebensmittel'),
      el('a', { class: 'knopf klein', href: '#/zutaten/neu' }, icon('plus', 18), 'Neu')),
    essenWahl('zutaten'),
    el('div', { class: 'suchzeile' },
      el('input', {
        type: 'search', class: 'suchfeld', placeholder: 'Suchen', 'aria-label': 'Zutat suchen', autocomplete: 'off',
        enterkeyhint: 'search', value: zustand.begriff,
        oninput: (e) => { zustand.begriff = e.target.value; zeichneTreffer(); zeichneOnline(); },
      }),
      el('button', { type: 'button', class: 'scan-knopf', 'aria-label': 'Strichcode scannen', onclick: scanne }, icon('barcode', 22), el('span', {}, 'Scannen'))),
    el('div', { class: 'wahl schmal-voll', role: 'group', 'aria-label': 'Auswahl' }, filter('Alle', 'alle'), filter('Favoriten', 'favoriten'), filter('Eigene', 'eigene')),
    kategorien,
    el('a', { class: 'textlink', href: '#/zutaten/mag' }, 'Mag-Liste für Obst und Gemüse'),
    el('p', { class: 'klein' }, 'Werte je 100 g'),
    treffer,
    online);
}

/* ---------- Detail ---------- */

function detail(wurzel, zutat, vorliebe, angebote, favoriten) {
  document.title = `${zutat.name} – ${APP_NAME}`;
  const istFavorit = favoriten.includes(zutat.id);
  // Menge für die Tabelle: 100 g oder eine Portion. Umschalten ändert nur die Zahlen, die Seite bleibt stehen
  const mengen = [{ name: '100 g', gramm: 100 }, ...(zutat.portionen ?? []).map((p) => ({ name: `1 ${p.name} (${zahl(p.gramm)} g)`, gramm: p.gramm }))];
  const tabelle = (gruppe, gramm) => naehrwertZeilen(zutat.je100, NAEHRSTOFFE.filter((n) => n.gruppe === gruppe), gramm)
    .map((r) => el('tr', { class: [r.unter ? 'unterzeile' : '', r.wert === null ? 'unbekannt' : ''].filter(Boolean).join(' ') || null },
      el('th', { scope: 'row' }, r.name),
      el('td', {}, r.wert === null ? 'unbekannt' : `${zahl(r.wert, r.einheit === 'kcal' ? 0 : 2)} ${r.einheit}`)));
  const makroKoerper = el('tbody', { id: 'naehrwerte-makro' });
  const mikroKoerper = el('tbody', { id: 'naehrwerte-mikro' });
  const titel = el('caption', {});
  const mikroBekannt = NAEHRSTOFFE.filter((n) => n.gruppe === 'mikro' && typeof zutat.je100[n.id] === 'number').length;
  const zeigeMenge = (m) => {
    titel.textContent = `Nährwerte je ${m.name}`;
    makroKoerper.replaceChildren(...tabelle('makro', m.gramm));
    mikroKoerper.replaceChildren(...tabelle('mikro', m.gramm));
  };
  zeigeMenge(mengen[0]);
  const mengenWahl = mengen.length > 1 ? el('div', { class: 'kategorie-chips', role: 'group', 'aria-label': 'Menge' }, mengen.map((m, i) => el('button', {
    type: 'button', class: 'chip', 'aria-pressed': String(i === 0),
    onclick: (e) => {
      for (const k of e.currentTarget.parentElement.children) k.setAttribute('aria-pressed', String(k === e.currentTarget));
      zeigeMenge(m);
    },
  }, m.name))) : null;

  const stern = el('button', {
    type: 'button', class: 'rund stern', 'aria-pressed': String(istFavorit), 'aria-label': istFavorit ? 'Aus den Favoriten nehmen' : 'Als Favorit merken',
    onclick: async (e) => {
      const knopf = e.currentTarget;
      const neu = schalteFavorit(await speicher.ladeFavoriten(), zutat.id);
      await speicher.setzeFavoriten(neu);
      const an = neu.includes(zutat.id);
      knopf.setAttribute('aria-pressed', String(an));
      knopf.setAttribute('aria-label', an ? 'Aus den Favoriten nehmen' : 'Als Favorit merken');
      knopf.textContent = an ? '★' : '☆';
      hinweis(an ? `${zutat.name} ist jetzt ein Favorit.` : `${zutat.name} ist kein Favorit mehr.`);
    },
  }, istFavorit ? '★' : '☆');

  // Eigene Portion: bei eigenen Zutaten direkt an der Zutat, bei mitgelieferten als Einstellung (die Datei ist nur lesbar)
  const portionName = el('input', { id: 'f-portion-name', placeholder: 'z. B. Becher', maxlength: 30, autocomplete: 'off' });
  const portionGramm = el('input', { id: 'f-portion-gramm', placeholder: 'Gramm', inputmode: 'decimal', autocomplete: 'off' });
  const portionFehler = el('p', { class: 'fehlertext', role: 'alert' });
  const legePortion = async (e) => {
    e.preventDefault();
    const pruefung = pruefePortion({ name: portionName.value, gramm: portionGramm.value });
    if (!pruefung.ok) { portionFehler.textContent = pruefung.fehler.name ?? pruefung.fehler.gramm; return; }
    if (istEigen(zutat)) {
      const andere = (zutat.portionen ?? []).filter((p) => p.name.toLowerCase() !== pruefung.portion.name.toLowerCase());
      await speicher.speichereZutat({ ...zutat, portionen: [...andere, pruefung.portion] });
    } else {
      await speicher.setzeEinstellung('portionenExtra', ergaenzePortion(await speicher.einstellung('portionenExtra', {}), zutat.id, pruefung.portion));
    }
    hinweis(`Portion „${pruefung.portion.name}“ gespeichert. Beim Eintragen steht sie zur Wahl.`);
    neuZeichnen();
  };

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
    el('header', { class: 'detailkopf zutat-kopf' },
      el('div', {},
        el('h1', {}, zutat.name),
        el('p', {}, [zutat.marke, kategorieName(zutat.kategorie)].filter(Boolean).join(', ')),
        el('p', { class: 'klein' }, `Quelle: ${QUELLEN[zutat.quelle] ?? 'unbekannt'}`)),
      stern),
    istObstGemuese(zutat) ? magBereich(zutat, vorliebe) : null,
    zutat.unvollstaendig ? el('p', { class: 'merkzettel' }, 'Bei dieser Zutat fehlen Angaben. Summen im Tagebuch fallen dadurch zu niedrig aus.') : null,
    mengenWahl,
    el('table', { class: 'naehrwerte', id: 'naehrwerte' }, titel, makroKoerper),
    el('details', { class: 'aufklappen' },
      el('summary', {}, `Vitamine und Mineralstoffe (${mikroBekannt} von ${NAEHRSTOFFE.filter((n) => n.gruppe === 'mikro').length} bekannt)`),
      el('table', { class: 'naehrwerte-mikro' }, mikroKoerper)),
    el('details', { class: 'aufklappen', id: 'portion-anlegen' },
      el('summary', {}, 'Eigene Portion anlegen'),
      el('form', { class: 'stapel', onsubmit: legePortion },
        el('div', { class: 'zeitraum-frei' },
          el('div', { class: 'feld' }, el('label', { for: 'f-portion-name' }, 'Name'), portionName),
          el('div', { class: 'feld' }, el('label', { for: 'f-portion-gramm' }, 'Gramm'), portionGramm)),
        portionFehler,
        el('button', { type: 'submit', class: 'knopf leise' }, 'Portion speichern'))),
    angebotBereich(zutat, angebote),
    el('div', { class: 'knopfreihe' },
      istEigen(zutat) ? el('button', { type: 'button', class: 'knopf leise', onclick: loeschen }, 'Löschen') : null,
      istEigen(zutat)
        ? el('a', { class: 'knopf', href: adresse(zutat.id, '/bearbeiten') }, 'Bearbeiten')
        : el('a', { class: 'knopf leise', href: `#/zutaten/neu/${encodeURIComponent(zutat.id)}` }, 'Als eigene Zutat kopieren')));
}

/** Angabe für die Mag-Liste direkt an der Zutat; der Sonderfall bekommt hier seine Beschreibung. */
function magBereich(zutat, vorliebe) {
  const merke = async (mag, notiz) => {
    await speicher.setzeVorliebe(zutat.id, mag, notiz);
    hinweis(mag ? 'Gemerkt.' : 'Angabe entfernt.');
    neuZeichnen();
  };
  return el('div', { class: 'stapel mag-bereich' },
    el('div', { class: 'feld' },
      el('label', { for: 'f-mag' }, 'Magst du das?'),
      el('select', { id: 'f-mag', onchange: (e) => merke(e.target.value, vorliebe?.notiz) },
        el('option', { value: '' }, 'Keine Angabe'),
        MAG.map((m) => el('option', { value: m.id, selected: vorliebe?.mag === m.id }, m.name)))),
    vorliebe?.mag === 'S' ? feld({
      name: 'mag-notiz', beschriftung: 'Was ist der Sonderfall?', placeholder: 'Zum Beispiel nur geschält', maxlength: 120,
      value: vorliebe.notiz ?? '', onchange: (e) => merke('S', e.target.value),
    }) : null);
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
