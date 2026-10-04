// Rezepte: Liste mit Filter und Sortierung, Detailansicht (#/rezepte/<id>) mit Nährwerten und „Portion eintragen“.
import { el, setze, zahl } from '../ui.js';
import { icon } from '../icons.js';
import { episch } from '../darstellung.js';
import { lese, schreibe } from '../db.js';
import { holeProfil, holeTag, speichereTag } from '../state.js';
import { holeLebensmittel, lebensmittelGeaendert, normalisiere } from '../lebensmittel.js';
import { datumSchluessel } from '../logic/ziele.js';
import { neueEintragsId } from '../logic/tag.js';
import { REZEPT_ARTEN, BEWERTUNGEN, neuesRezept, proPortion, portionsGewicht, gesamtNote } from '../logic/rezepte.js';
import { pruefeLebensmittel } from '../logic/ernaehrungsweise.js';
import { oeffneRezeptEditor } from './rezept-editor.js';
import { mahlzeitNachUhrzeit } from './memo-dialog.js';

let artFilter = null;
let sortierung = 'note';
let suche = '';

export const rezepte = {
  get titel() { return episch('Rezeptbuch', 'Rezepte'); },
  reiter: 'mehr',
  render() {
    const wurzel = el('div', {}, el('p', { class: 'leise' }, 'Lade …'));
    lade(wurzel);
    return wurzel;
  },
};

export async function holeRezepte() {
  return (await lese('einstellungen', 'rezepte')) ?? [];
}

export async function speichereRezepte(liste) {
  await schreibe('einstellungen', 'rezepte', liste);
  lebensmittelGeaendert();
}

const neueId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

async function lade(wurzel) {
  const [liste, daten, profil] = await Promise.all([holeRezepte(), holeLebensmittel(), holeProfil()]);
  const k = { wurzel, liste, daten, profil, neu: () => lade(wurzel) };
  const id = decodeURIComponent(location.hash.split('/')[2] ?? '');
  const rezept = liste.find((r) => r.id === id);
  if (rezept) setze(wurzel, ...detail(k, rezept));
  else zeichneListe(k);
}

function bearbeite(k, rezept, istNeu) {
  oeffneRezeptEditor({
    rezept,
    basis: k.daten.basis,
    einstellung: k.profil.ernaehrung,
    beiSpeichern: async (neu) => {
      await speichereRezepte(istNeu ? [...k.liste, neu] : k.liste.map((r) => (r.id === neu.id ? neu : r)));
      if (istNeu) location.hash = `#/rezepte/${neu.id}`; else k.neu();
    },
    beiLoeschen: istNeu ? null : async () => {
      await speichereRezepte(k.liste.filter((r) => r.id !== rezept.id));
      location.hash = '#/rezepte';
    },
  });
}

function noteText(note) {
  return note ? `${zahl(note)}/10` : 'ohne Note';
}

function zeichneListe(k) {
  const begriffe = normalisiere(suche).split(/\s+/).filter(Boolean);
  const sichtbar = k.liste
    .filter((r) => !artFilter || r.art === artFilter)
    .filter((r) => begriffe.every((b) => normalisiere(`${r.name} ${r.tags.join(' ')}`).includes(b)))
    .sort((a, b) => (sortierung === 'note' ? (gesamtNote(b) ?? 0) - (gesamtNote(a) ?? 0)
      : sortierung === 'protein' ? (proPortion(b, k.daten.basis).protein ?? 0) - (proPortion(a, k.daten.basis).protein ?? 0)
        : a.name.localeCompare(b.name)));
  const sucheFeld = el('input', {
    type: 'search', value: suche, placeholder: 'Name oder Tag suchen …', 'aria-label': 'Rezepte suchen',
    oninput: (e) => { suche = e.target.value; clearTimeout(sucheFeld.t); sucheFeld.t = setTimeout(() => { zeichneListe(k); document.querySelector('.rezept-suche')?.focus(); }, 250); },
    class: 'rezept-suche',
  });
  const chip = (text, an, beiKlick) => el('button', { class: `chip${an ? ' an' : ''}`, type: 'button', 'aria-pressed': String(an), onclick: beiKlick }, text);

  setze(k.wurzel,
    el('div', { class: 'knopfreihe' },
      el('button', { class: 'knopf', type: 'button', onclick: () => bearbeite(k, neuesRezept(neueId(), artFilter ?? 'gericht'), true) }, icon('plus', 18), 'Neues Rezept'),
      el('a', { class: 'knopf zweitrangig', href: '#/mealprep' }, icon('mealprep', 18), 'Meal-Prep')),
    k.liste.length ? sucheFeld : null,
    k.liste.length ? el('div', { class: 'chips scroll', style: 'margin:10px 0' },
      chip('Alle', !artFilter, () => { artFilter = null; zeichneListe(k); }),
      ...Object.entries(REZEPT_ARTEN).map(([id, a]) => chip(episch(a.episch, a.name), artFilter === id, () => { artFilter = id; zeichneListe(k); }))) : null,
    k.liste.length ? el('div', { class: 'chips', style: 'margin-bottom:10px' },
      el('span', { class: 'leise klein' }, 'Sortieren:'),
      ...[['note', 'Note'], ['protein', 'Protein'], ['name', 'Name']].map(([id, t]) => chip(t, sortierung === id, () => { sortierung = id; zeichneListe(k); }))) : null,
    k.liste.length ? null : el('section', { class: 'karte willkommen' },
      el('div', { class: 'logo' }, icon('rezepte', 34)),
      el('h2', {}, episch('Das Rezeptbuch ist noch leer', 'Noch keine Rezepte')),
      el('p', { class: 'leise' }, 'Lege Gerichte, Shakes und Meal-Prep-Rezepte an – mit Bewertung, Geschmack und Vorteilen. Danach kannst du Portionen direkt eintragen.')),
    ...sichtbar.map((r) => {
      const p = proPortion(r, k.daten.basis);
      const passt = r.zutaten.every((z) => { const lm = k.daten.basis.find((l) => l.id === z.lebensmittelId); return !lm || pruefeLebensmittel(lm, k.profil.ernaehrung).passt; });
      return el('a', { class: 'karte rezept-karte', href: `#/rezepte/${r.id}` },
        el('div', { class: 'zeile' },
          el('strong', {}, r.art === 'trank' ? episch('⚗️ ', '🥤 ') : '', r.name),
          el('span', { class: 'rezept-note' }, noteText(gesamtNote(r)))),
        el('p', { class: 'leise klein' },
          `${episch(REZEPT_ARTEN[r.art]?.episch, REZEPT_ARTEN[r.art]?.name)} · ${zahl(Math.round(p.kcal ?? 0))} kcal · ${zahl(Math.round(p.protein ?? 0))} g Protein pro Portion`),
        el('div', { class: 'chips' },
          ...r.tags.slice(0, 4).map((t) => el('span', { class: 'marke' }, t)),
          passt ? null : el('span', { class: 'marke warn' }, 'passt nicht zur Ernährungsweise'),
          r.wiederEssen ? null : el('span', { class: 'marke warn' }, 'nicht wieder')));
    }));
}

function detail(k, r) {
  const p = proPortion(r, k.daten.basis);
  const nachId = new Map(k.daten.basis.map((l) => [l.id, l]));
  const pg = portionsGewicht(r);
  return [
    el('a', { class: 'knopf-text zurueck-link', href: '#/rezepte' }, icon('zurueck', 18), episch('Rezeptbuch', 'Rezepte')),
    el('section', { class: 'karte hero' },
      el('div', { class: 'zeile' }, el('h2', {}, r.name), el('span', { class: 'rezept-note gross' }, noteText(gesamtNote(r)))),
      el('p', { class: 'leise klein' }, `${episch(REZEPT_ARTEN[r.art]?.episch, REZEPT_ARTEN[r.art]?.name)} · ${r.portionen} Portion${r.portionen === 1 ? '' : 'en'} à ${zahl(Math.round(pg))} g`),
      el('div', { class: 'statistik' },
        el('div', { class: 'stat' }, el('strong', {}, zahl(Math.round(p.kcal ?? 0))), el('span', {}, 'kcal')),
        el('div', { class: 'stat' }, el('strong', {}, `${zahl(Math.round(p.protein ?? 0))} g`), el('span', {}, 'Protein')),
        el('div', { class: 'stat' }, el('strong', {}, `${zahl(Math.round(p.kh ?? 0))}/${zahl(Math.round(p.fett ?? 0))}`), el('span', {}, 'KH/Fett g'))),
      portionEintragen(k, r)),
    el('section', { class: 'karte' },
      el('h2', {}, 'Geschmack & Vorteile'),
      el('p', {}, el('strong', {}, 'Geschmack: '), r.geschmackText || '–'),
      el('p', {}, el('strong', {}, 'Vorteile: '), r.vorteile || '–'),
      el('ul', { class: 'liste-einfach klein' }, ...Object.entries(BEWERTUNGEN).map(([key, t]) => el('li', {}, `${t}: ${r.bewertung[key] ?? '–'}`))),
      r.tags.length ? el('div', { class: 'chips' }, ...r.tags.map((t) => el('span', { class: 'marke' }, t))) : null,
      r.notiz ? el('p', { class: 'leise' }, r.notiz) : null),
    el('section', { class: 'karte' },
      el('h2', {}, 'Zutaten'),
      el('ul', { class: 'liste-einfach' }, ...r.zutaten.map((z) => el('li', {}, `${zahl(z.gramm)} g ${nachId.get(z.lebensmittelId)?.name ?? z.lebensmittelId}`))),
      r.gewichtGekochtG ? el('p', { class: 'leise klein' }, `Gewicht nach dem Kochen: ${zahl(r.gewichtGekochtG)} g`) : null),
    r.zubereitung ? el('section', { class: 'karte' }, el('h2', {}, 'Zubereitung'), el('p', { class: 'chronik-text' }, r.zubereitung)) : null,
    el('div', { class: 'knopfreihe' },
      el('button', { class: 'knopf zweitrangig', type: 'button', onclick: () => bearbeite(k, r, false) }, icon('stift', 18), 'Bearbeiten'),
      el('a', { class: 'knopf zweitrangig', href: `#/mealprep/${r.id}` }, icon('mealprep', 18), 'Meal-Prep')),
  ];
}

function portionEintragen(k, r) {
  const status = el('p', { class: 'leise klein', role: 'status' });
  let mahlzeit = mahlzeitNachUhrzeit(k.profil.mahlzeiten);
  let anzahl = 1;
  const anzahlFeld = el('input', { type: 'number', inputMode: 'decimal', min: 0.25, step: 0.25, value: 1, 'aria-label': 'Portionen', oninput: (e) => { anzahl = e.target.valueAsNumber || 1; } });
  return el('div', { class: 'portion-eintragen' },
    el('div', { class: 'felder' },
      el('label', { class: 'feld' }, el('span', {}, 'Mahlzeit'),
        el('select', { onchange: (e) => { mahlzeit = e.target.value; } },
          ...k.profil.mahlzeiten.map((m) => el('option', { value: m.id, selected: m.id === mahlzeit }, m.name)))),
      el('label', { class: 'feld' }, el('span', {}, 'Portionen'), anzahlFeld)),
    el('button', {
      class: 'knopf voll', type: 'button',
      onclick: async () => {
        const tag = await holeTag(datumSchluessel(new Date()));
        tag.eintraege.push({ id: neueEintragsId(), mahlzeit, lebensmittelId: `rezept:${r.id}`, gramm: Math.round(portionsGewicht(r) * anzahl), zeit: new Date().toISOString() });
        await speichereTag(tag);
        status.textContent = episch('Aufgetischt! Eingetragen für heute.', 'Für heute eingetragen.');
      },
    }, icon('plus', 18), 'Heute eintragen'),
    status);
}
