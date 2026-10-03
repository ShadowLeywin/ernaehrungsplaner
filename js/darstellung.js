// Darstellung: Farbthema und Hell/Dunkel. Pro Gerät im localStorage (reine Bequemlichkeit, kein Backup nötig).
// Wird zusätzlich in index.html früh gesetzt, damit beim Start nichts aufblitzt – Schlüssel dort gleich halten.

export const THEMEN = {
  wald: { name: 'Wald', farben: ['#4ade80', '#14b8a6'] },
  ozean: { name: 'Ozean', farben: ['#38bdf8', '#818cf8'] },
  glut: { name: 'Glut', farben: ['#fb923c', '#f43f5e'] },
  nacht: { name: 'Nacht', farben: ['#a78bfa', '#f472b6'] },
  gold: { name: 'Gold', farben: ['#facc15', '#fb923c'] },
  limette: { name: 'Limette', farben: ['#bef264', '#4ade80'] },
};

export const MODI = { system: 'System', hell: 'Hell', dunkel: 'Dunkel' };

const SCHLUESSEL = 'darstellung';
const STANDARD = { thema: 'glut', modus: 'system' };
const dunkelAbfrage = window.matchMedia('(prefers-color-scheme: dark)');

export function ladeDarstellung() {
  try {
    const gespeichert = JSON.parse(localStorage.getItem(SCHLUESSEL) ?? 'null');
    return {
      thema: THEMEN[gespeichert?.thema] ? gespeichert.thema : STANDARD.thema,
      modus: MODI[gespeichert?.modus] ? gespeichert.modus : STANDARD.modus,
    };
  } catch {
    return { ...STANDARD };
  }
}

export function wendeDarstellungAn({ thema, modus } = ladeDarstellung()) {
  const dunkel = modus === 'dunkel' || (modus === 'system' && dunkelAbfrage.matches);
  document.documentElement.dataset.thema = thema;
  document.documentElement.dataset.modus = dunkel ? 'dunkel' : 'hell';
  // Statusleiste des Handys an den Hintergrund anpassen
  requestAnimationFrame(() => {
    const farbe = zuRgb(getComputedStyle(document.body).backgroundColor);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', farbe);
  });
}

/** Beliebige CSS-Farbe (z. B. oklab aus color-mix) in rgb() umwandeln – theme-color versteht nicht alles. */
function zuRgb(farbe) {
  const kontext = document.createElement('canvas').getContext('2d');
  kontext.fillStyle = farbe;
  kontext.fillRect(0, 0, 1, 1);
  const [r, g, b] = kontext.getImageData(0, 0, 1, 1).data;
  return `rgb(${r}, ${g}, ${b})`;
}

export function speichereDarstellung(darstellung) {
  try { localStorage.setItem(SCHLUESSEL, JSON.stringify(darstellung)); } catch { /* privater Modus: nur für diese Sitzung */ }
  wendeDarstellungAn(darstellung);
}

// Bei „System“ dem Handy folgen, wenn es zwischen hell und dunkel wechselt
dunkelAbfrage.addEventListener('change', () => wendeDarstellungAn());
