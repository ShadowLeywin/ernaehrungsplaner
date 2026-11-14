// Hash-Router: die Adresse hinter dem # bestimmt die Ansicht (#/heute, #/zutaten/neu …).
// Ein Hash-Router braucht keinen Server, der Adressen umschreibt; deshalb läuft er auf GitHub Pages.

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
    seite.replaceChildren(Object.assign(document.createElement('p'), {
      className: 'fehlerseite',
      textContent: `Diese Seite konnte nicht geladen werden: ${fehler.message}`,
    }));
  }
  if (meinLauf !== lauf) return;
  const rollen = wurzel.dataset.adresse === location.hash ? window.scrollY : 0;
  wurzel.replaceChildren(seite);
  wurzel.dataset.adresse = location.hash;
  window.scrollTo(0, rollen);
}

export function starte(element, standardRoute) {
  wurzel = element;
  standard = standardRoute;
  window.addEventListener('hashchange', zeichne);
  return zeichne();
}
