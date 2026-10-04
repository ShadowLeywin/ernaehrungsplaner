// Einfacher Hash-Router: "#/heute" → Ansicht "heute".
// Hash-Routen brauchen keine Server-Konfiguration und laufen so auch auf GitHub Pages.

export function aktuelleRoute(hash = location.hash) {
  const name = hash.replace(/^#\/?/, '').split('/')[0];
  return name || null;
}

/** wache(name): optional – liefert eine andere Route, wenn `name` gerade nicht erlaubt ist. */
export function starteRouter(ansichten, standard, ziel, wache = () => null) {
  const zeige = () => {
    const name = aktuelleRoute();
    const ansicht = ansichten[name];
    if (!ansicht) {
      location.replace(`#/${standard}`);
      return;
    }
    const umleitung = wache(name);
    if (umleitung && umleitung !== name) {
      location.replace(`#/${umleitung}`);
      return;
    }
    document.body.dataset.route = name;
    // Ansichten können statt des Titels einen eigenen Kopf liefern (z. B. den FORGEBORN-Schriftzug)
    const titel = document.getElementById('titel');
    if (ansicht.kopf) titel.replaceChildren(ansicht.kopf());
    else titel.textContent = ansicht.titel;
    document.title = `${ansicht.titel} – FORGEBORN`;
    ziel.replaceChildren(ansicht.render());
    ziel.focus({ preventScroll: true });
    window.scrollTo(0, 0);

    // Unter-Ansichten aus "Mehr" markieren den Mehr-Reiter
    const reiter = ansicht.reiter ?? name;
    document.querySelectorAll('.navigation a').forEach((a) => {
      a.classList.toggle('aktiv', a.dataset.route === reiter);
    });
  };

  window.addEventListener('hashchange', zeige);
  zeige();
  return zeige; // zum Neuzeichnen der aktuellen Seite, z. B. nach Einstellungen
}
