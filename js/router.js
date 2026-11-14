// Hash-Router: die Adresse hinter dem # bestimmt die Ansicht (#/heute, #/zutaten/neu …).
// Ein Hash-Router braucht keinen Server, der Adressen umschreibt; deshalb läuft er auf GitHub Pages.

import { richtungZwischen } from './logik/navigation.js';

const ansichten = new Map();
let wurzel;
let standard;
let lauf = 0;

/** Ansicht anmelden: name ist der erste Teil der Adresse, zeige(wurzel, teile) baut die Seite. */
export function route(name, zeige) {
  ansichten.set(name, zeige);
}

export const gehe = (pfad) => { location.hash = pfad; };

/** Aktuelle Ansicht neu zeichnen (nach dem Speichern) */
export const neuZeichnen = () => zeichne();

/** Bei einem echten Seitenwechsel (auch Zurück-Taste) gehören offene Blätter zur alten Seite: sofort schließen. */
function seitenwechsel() {
  for (const d of document.querySelectorAll('dialog[open]')) d.close();
  return zeichne();
}

async function zeichne() {
  const teile = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const name = ansichten.has(teile[0]) ? teile[0] : standard;
  const meinLauf = ++lauf;

  for (const link of document.querySelectorAll('.navigation a')) {
    // Ein Eintrag der Leiste kann für mehrere Bereiche stehen (Zutaten gehören zu Rezepte)
    if (link.dataset.route.split(' ').includes(name)) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }

  // In ein loses Element zeichnen und erst am Ende einhängen: kein Flackern, und ein
  // überholter Aufruf (schnelles Blättern) kann die neuere Seite nicht überschreiben.
  const seite = document.createElement('div');
  seite.className = `seite seite-${name}`;
  try {
    await ansichten.get(name)(seite, teile.slice(1));
  } catch (fehler) {
    console.error(fehler);
    // Mit Ausweg: neu laden oder zurück zum Tagebuch, statt auf einer leeren Seite festzustecken
    const text = Object.assign(document.createElement('p'), { className: 'fehlerseite', textContent: `Diese Seite konnte nicht geladen werden: ${fehler.message}` });
    const neu = Object.assign(document.createElement('button'), { type: 'button', className: 'knopf', textContent: 'Neu laden', onclick: () => location.reload() });
    const heute = Object.assign(document.createElement('a'), { className: 'knopf leise', href: '#/heute', textContent: 'Zum Tagebuch' });
    const reihe = Object.assign(document.createElement('div'), { className: 'knopfreihe links' });
    reihe.append(neu, heute);
    seite.replaceChildren(text, reihe);
  }
  if (meinLauf !== lauf) return;
  const gleicheSeite = wurzel.dataset.adresse === location.hash;
  // Neue Adresse: kurz einschieben, in Richtung der Bewegung. Neu zeichnen nach dem Speichern bleibt ruhig.
  // Leere Adresse = Startseite; beim allerersten Zeichnen gibt es noch keine alte Adresse
  const alt = 'adresse' in wurzel.dataset ? (wurzel.dataset.adresse || `#/${standard}`) : '';
  if (!gleicheSeite) seite.classList.add('einblenden', `richtung-${richtungZwischen(alt, location.hash || `#/${standard}`)}`);
  const rollen = gleicheSeite ? window.scrollY : 0;
  wurzel.replaceChildren(seite);
  wurzel.dataset.adresse = location.hash;
  window.scrollTo(0, rollen);
}

export function starte(element, standardRoute) {
  wurzel = element;
  standard = standardRoute;
  window.addEventListener('hashchange', seitenwechsel);
  return zeichne();
}
