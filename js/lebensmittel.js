// Lädt die Lebensmitteldatenbank (data/lebensmittel.json, vom Service Worker offline vorgehalten)
// und ergänzt sie um eigene Lebensmittel (z. B. per Barcode aus Open Food Facts) und Rezepte.
import { lese } from './db.js';
import { rezeptAlsLebensmittel } from './logic/rezepte.js';
import { SCHAETZWERTE } from './logic/vorschlaege.js';

let basisVersprechen;
let gesamtVersprechen;

function holeBasis() {
  basisVersprechen ??= fetch('./data/lebensmittel.json')
    .then((antwort) => {
      if (!antwort.ok) throw new Error(`Lebensmittel konnten nicht geladen werden (${antwort.status})`);
      return antwort.json();
    })
    .catch((fehler) => { basisVersprechen = undefined; throw fehler; });
  return basisVersprechen;
}

/** { …daten, lebensmittel: [Basis, eigene, Rezepte], basis: [Basis + eigene] } */
export function holeLebensmittel() {
  gesamtVersprechen ??= Promise.all([holeBasis(), lese('einstellungen', 'eigeneLebensmittel'), lese('einstellungen', 'rezepte')])
    .then(([daten, eigene, rezepte]) => {
      const basis = [...daten.lebensmittel, ...(eigene ?? [])];
      const ausRezepten = (rezepte ?? []).map((r) => rezeptAlsLebensmittel(r, basis)).filter(Boolean);
      return { ...daten, basis, lebensmittel: [...basis, ...ausRezepten, ...SCHAETZWERTE] };
    })
    .catch((fehler) => { gesamtVersprechen = undefined; throw fehler; });
  return gesamtVersprechen;
}

/** Nach Änderungen an eigenen Lebensmitteln oder Rezepten aufrufen. */
export function lebensmittelGeaendert() {
  gesamtVersprechen = undefined;
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
    const name = normalisiere(`${l.name} ${l.marke ?? ''}`);
    return begriffe.every((b) => name.includes(b));
  });
}
