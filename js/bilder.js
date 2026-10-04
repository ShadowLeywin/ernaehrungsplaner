// Optionale Bilder (KI-Artwork, siehe docs/bild-prompts.md). Fehlt ein Bild, nutzt die App ihre SVG-Grafik.
// Gesucht wird erst .webp, dann .png. Fehlende Bilder merkt sich die Sitzung, damit nicht ständig 404 entstehen.

const ENDUNGEN = ['webp', 'png'];
const fehlt = new Set();
const gefunden = new Map();

/** Lädt bilder/<pfad>.(webp|png). Liefert die URL oder null. */
export function findeBild(pfad) {
  if (gefunden.has(pfad)) return Promise.resolve(gefunden.get(pfad));
  if (fehlt.has(pfad)) return Promise.resolve(null);
  return new Promise((aufloesen) => {
    let i = 0;
    const probe = new Image();
    probe.decoding = 'async';
    probe.onload = () => { const url = probe.src; gefunden.set(pfad, url); aufloesen(url); };
    probe.onerror = () => {
      i += 1;
      if (i < ENDUNGEN.length) probe.src = `./bilder/${pfad}.${ENDUNGEN[i]}`;
      else { fehlt.add(pfad); aufloesen(null); }
    };
    probe.src = `./bilder/${pfad}.${ENDUNGEN[0]}`;
  });
}

/** Kopfbild einer Seite (nur im epischen Stil). Bleibt unsichtbar, wenn es das Bild nicht gibt. */
export function kopfBild(name, titel = '') {
  const huelle = document.createElement('div');
  huelle.className = 'kopf-bild';
  huelle.hidden = true;
  if (document.documentElement.dataset.stil === 'schlicht') return huelle;
  const zeige = (url) => {
    if (!url) return;
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    huelle.append(img);
    if (titel) {
      const t = document.createElement('span');
      t.className = 'kopf-bild-titel';
      t.textContent = titel;
      huelle.append(t);
    }
    huelle.hidden = false;
  };
  // Schon bekannt? Dann sofort zeigen (kein Flackern beim Neuzeichnen)
  if (gefunden.has(`kopf/${name}`)) zeige(gefunden.get(`kopf/${name}`));
  else findeBild(`kopf/${name}`).then(zeige);
  return huelle;
}

/** Pflanzliche Ernährung: Vorratskammer als Gemüsehaus statt Fleischhaus. */
export const istFleischlos = (profil) => ['vegetarisch', 'vegan'].includes(profil?.ernaehrung?.weise);

/** Bild eines Bauwerks: höchste vorhandene Stufe ≤ gebaute, Varianten (z. B. Gemüsehaus) bevorzugt. */
export async function bauBild(id, stufe, fleischlos = false) {
  const namen = id === 'vorratskammer' && fleischlos ? ['vorratskammer-veg', id] : [id];
  for (let st = stufe; st >= 1; st -= 1) {
    for (const n of namen) {
      const url = await findeBild(`bauten/${n}-${st}`);
      if (url) return url;
    }
  }
  return null;
}
