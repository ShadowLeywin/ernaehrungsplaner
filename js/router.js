// Einfacher Hash-Router: "#/heute" → Ansicht "heute".
// Hash-Routen brauchen keine Server-Konfiguration und laufen so auch auf GitHub Pages.

export function aktuelleRoute(hash = location.hash) {
  const name = hash.replace(/^#\/?/, '').split('/')[0];
  return name || null;
}

export function starteRouter(ansichten, standard, ziel) {
  const zeige = () => {
    const name = aktuelleRoute();
    const ansicht = ansichten[name];
    if (!ansicht) {
      location.replace(`#/${standard}`);
      return;
    }
    document.getElementById('titel').textContent = ansicht.titel;
    document.title = `${ansicht.titel} – Ernährungsplaner`;
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
}
