// Märkte: die eigenen Märkte für Preise und Vergleich. Suchen in OpenStreetMap nur auf Knopfdruck,
// mit dem eingegebenen Ort oder der Postleitzahl, nie mit einem Standort. Oder einen Markt von Hand anlegen.

import { OSM_HINWEIS, OSM_LIZENZ_URL, adresseText, leseOverpass, overpassUrl, pruefeEigenerMarkt, pruefeOrt } from '../logik/osm.js';
import { APP_NAME } from '../logik/schema.js';
import { holeJson } from '../plattform.js';
import { neuZeichnen } from '../router.js';
import * as speicher from '../speicher.js';
import { el, haenge, hinweis, icon } from '../ui.js';

// Suche und Treffer überleben ein Neuzeichnen der Seite (nach „Merken“ oder „Entfernen“)
const entwurf = { ort: '', treffer: null, meldung: '' };

/** Overpass fragen. Fehler als verständlicher Satz; bei 429 nicht wiederholen, wer oft drängelt, wird gesperrt. */
async function sucheMaerkte(ort) {
  let antwort;
  try {
    antwort = await holeJson(overpassUrl(ort), 30000);
  } catch (fehler) {
    if (fehler.name === 'AbortError') throw new Error('OpenStreetMap hat nicht rechtzeitig geantwortet. Versuch es später noch einmal.');
    throw new Error('Keine Verbindung zu OpenStreetMap. Bist du online?');
  }
  if (antwort.status === 429 || antwort.status === 504) throw new Error('Der Suchdienst von OpenStreetMap ist gerade ausgelastet. Versuch es in ein paar Minuten noch einmal.');
  if (antwort.status < 200 || antwort.status >= 300) throw new Error(`Der Suchdienst antwortet mit Fehler ${antwort.status}.`);
  return leseOverpass(antwort.daten);
}

export async function zeigeMaerkte(wurzel) {
  const meine = (await speicher.alleMaerkte()).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const gemerkt = new Set(meine.map((m) => m.id));
  document.title = `Märkte – ${APP_NAME}`;

  const zeile = (m, knopf) => el('li', { class: 'zeile markt-zeile' },
    el('span', { class: 'zeile-name' }, m.name, el('small', {}, [m.art, adresseText(m)].filter(Boolean).join(' · ') || (m.quelle === 'eigen' ? 'von Hand angelegt' : ''))),
    knopf);

  const entferne = async (m) => {
    await speicher.loescheMarkt(m.id);
    hinweis(`${m.name} entfernt.`, { aktion: 'Rückgängig', beiAktion: async () => { await speicher.speichereMarkt(m); neuZeichnen(); } });
    neuZeichnen();
  };
  const merke = async (m, knopf) => {
    await speicher.speichereMarkt(m);
    // An Ort und Stelle umschalten statt neu zeichnen: Die Trefferliste bleibt, wo der Finger ist
    knopf.textContent = 'Gemerkt';
    knopf.disabled = true;
    gemerkt.add(m.id);
    hinweis(`${m.name} gemerkt.`);
  };

  // Suche
  const ortFeld = el('input', { id: 'f-markt-ort', type: 'search', value: entwurf.ort, placeholder: 'Ort oder PLZ', autocomplete: 'off', enterkeyhint: 'search', 'aria-describedby': 'f-markt-ort-fehler', oninput: (e) => { entwurf.ort = e.target.value; } });
  const ortFehler = el('p', { class: 'fehlertext', id: 'f-markt-ort-fehler', role: 'alert' });
  const suchKnopf = el('button', { type: 'submit', class: 'knopf' }, 'Suchen');
  const suche = async (e) => {
    e.preventDefault();
    const pruefung = pruefeOrt(ortFeld.value);
    if (!pruefung.ok) { ortFehler.textContent = pruefung.fehler; ortFeld.focus(); return; }
    ortFehler.textContent = '';
    suchKnopf.disabled = true;
    suchKnopf.textContent = 'Suche …';
    try {
      entwurf.treffer = await sucheMaerkte(pruefung.ort);
      entwurf.meldung = entwurf.treffer.length ? '' : 'Keine Läden gefunden. Schreib den Ort genau wie auf dem Ortsschild, oder nimm die Postleitzahl.';
    } catch (fehler) {
      entwurf.treffer = null;
      entwurf.meldung = fehler.message;
    }
    neuZeichnen();
  };

  // Eigener Markt
  const eigenName = el('input', { id: 'f-markt-name', placeholder: 'Name, z. B. Hofladen Huber', maxlength: 60, autocomplete: 'off' });
  const eigenOrt = el('input', { id: 'f-markt-eigen-ort', placeholder: 'Ort (freiwillig)', maxlength: 60, autocomplete: 'off' });
  const eigenFehler = el('p', { class: 'fehlertext', role: 'alert' });
  const lege = async (e) => {
    e.preventDefault();
    const pruefung = pruefeEigenerMarkt({ name: eigenName.value, ort: eigenOrt.value });
    if (!pruefung.ok) { eigenFehler.textContent = pruefung.fehler.name; eigenName.focus(); return; }
    await speicher.speichereMarkt({ ...pruefung.markt, id: `eigen:${crypto.randomUUID()}` });
    hinweis(`${pruefung.markt.name} angelegt.`);
    neuZeichnen();
  };

  haenge(wurzel,
    el('a', { class: 'zurueck', href: '#/einkauf' }, icon('zurueck', 18), 'Einkaufsliste'),
    el('header', { class: 'detailkopf' },
      el('h1', {}, 'Märkte'),
      el('p', {}, 'Deine Märkte für Preise und Vergleich in der Einkaufsliste.')),

    el('h2', {}, 'Meine Märkte'),
    meine.length
      ? el('ul', { class: 'zeilen', id: 'meine-maerkte' }, meine.map((m) => zeile(m, el('button', { type: 'button', class: 'rund', 'aria-label': `${m.name} entfernen`, onclick: () => entferne(m) }, icon('zu', 20)))))
      : el('p', { class: 'leer' }, 'Noch keine Märkte. Such unten nach deinem Ort, oder leg einen Markt von Hand an.'),

    el('h2', {}, 'In OpenStreetMap suchen'),
    el('form', { class: 'zusatz', onsubmit: suche }, ortFeld, suchKnopf),
    ortFehler,
    el('p', { class: 'klein' }, 'Elan fragt den Suchdienst Overpass nach Läden in diesem Ort. Gesendet wird nur, was du eingibst, kein Standort. ',
      el('a', { href: OSM_LIZENZ_URL, target: '_blank', rel: 'noopener' }, `Daten ${OSM_HINWEIS}`), '.'),
    entwurf.meldung ? el('p', { class: 'merkzettel', role: 'status' }, entwurf.meldung) : null,
    entwurf.treffer?.length ? el('ul', { class: 'zeilen', id: 'markt-treffer' }, entwurf.treffer.map((m) => {
      const knopf = el('button', { type: 'button', class: 'knopf leise', disabled: gemerkt.has(m.id) ? true : null }, gemerkt.has(m.id) ? 'Gemerkt' : 'Merken');
      knopf.onclick = () => merke(m, knopf);
      return zeile(m, knopf);
    })) : null,

    el('h2', {}, 'Von Hand anlegen'),
    el('form', { class: 'stapel', onsubmit: lege },
      el('div', { class: 'feld' }, el('label', { for: 'f-markt-name' }, 'Name'), eigenName),
      el('div', { class: 'feld' }, el('label', { for: 'f-markt-eigen-ort' }, 'Ort'), eigenOrt),
      eigenFehler,
      el('button', { type: 'submit', class: 'knopf leise' }, 'Anlegen')));
}
