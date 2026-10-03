// Lädt die Lebensmitteldatenbank (data/lebensmittel.json, vom Service Worker offline vorgehalten).

let datenVersprechen;

export function holeLebensmittel() {
  datenVersprechen ??= fetch('./data/lebensmittel.json')
    .then((antwort) => {
      if (!antwort.ok) throw new Error(`Lebensmittel konnten nicht geladen werden (${antwort.status})`);
      return antwort.json();
    })
    .catch((fehler) => { datenVersprechen = undefined; throw fehler; });
  return datenVersprechen;
}

/** Suche ohne Groß-/Kleinschreibung und Umlaut-Unterschiede (ae = ä usw.). */
export function normalisiere(text) {
  return text.toLowerCase()
    .replaceAll('ä', 'ae').replaceAll('ö', 'oe').replaceAll('ü', 'ue').replaceAll('ß', 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function sucheLebensmittel(liste, anfrage) {
  const begriffe = normalisiere(anfrage).split(/\s+/).filter(Boolean);
  if (!begriffe.length) return liste;
  return liste.filter((l) => {
    const name = normalisiere(l.name);
    return begriffe.every((b) => name.includes(b));
  });
}
