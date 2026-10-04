// Ersatz-Grafiken der Bauwerke (Tusche-Stil), eingefärbt nach Ausbaustufe. Mit KI-Bildern unter
// bilder/bauten/<id>-<stufe>.webp werden sie ersetzt (siehe docs/bild-prompts.md).

const K = '#120a06';
// Material je Stufe: [Grundfarbe, Schatten, Licht]
export const MATERIAL = [
  ['#5a5049', '#3a332e', '#7a6e66'], // 0 = noch nicht gebaut (Grundriss)
  ['#8a5a34', '#5b3720', '#b07a4b'], // Holz
  ['#8b8f96', '#5d6168', '#b9bdc4'], // Stein
  ['#5f6b7a', '#3b4450', '#a8b4c4'], // Eisen
  ['#d6a845', '#9c7424', '#ffe39a'], // Gold
  ['#ff8a3d', '#b4441a', '#ffd9a0'], // Legendär
];

const FORMEN = {
  amboss: (g, s, l) => `<path d="M10 30h36l-4 6H30v8h8v6H18v-6h8v-8H18q-6 0-8-6Z" fill="${g}"/><path d="M10 30h36l-2 3H12Z" fill="${l}"/><path d="M26 36h4v8h-4Z" fill="${s}"/>`,
  brunnen: (g, s, l) => `<ellipse cx="32" cy="46" rx="20" ry="7" fill="${s}"/><path d="M12 30h40v16H12Z" fill="${g}"/><ellipse cx="32" cy="30" rx="20" ry="6" fill="${l}"/><ellipse cx="32" cy="30" rx="15" ry="4" fill="#3b82c4"/><path d="M16 30V14h32v16M14 14h36" fill="none" stroke="${K}" stroke-width="3"/>`,
  banner: (g, s, l) => `<path d="M20 8v48" stroke="${s}" stroke-width="4"/><path d="M22 10h24v26l-12-6-12 6Z" fill="${g}"/><path d="M22 10h24v6H22Z" fill="${l}"/><path d="M34 18c-3 0-4-2-3.5-4 .5-2 2-2.5 2.3-4.2.7 1 1 1.6 1.2 2.3.1-1.6.9-3.3 1.8-4.2.3 2.2 2.2 3.5 2.6 5.8.4 2.4-1 4.3-4.4 4.3Z" fill="${K}" opacity=".7"/>`,
  esse: (g, s, l) => `<path d="M12 22h40v30H12Z" fill="${g}"/><path d="M18 30h28v14H18Z" fill="${s}"/><path d="M22 44q10-14 20 0Z" fill="#ff8a3d"/><path d="M26 44q6-9 12 0Z" fill="#ffd27a"/><path d="M26 8h12v14H26Z" fill="${s}"/><path d="M12 22h40v4H12Z" fill="${l}"/>`,
  kraeutergarten: (g, s, l) => `<path d="M8 40h48v12H8Z" fill="${g}"/><path d="M8 40h48v3H8Z" fill="${l}"/><path d="M16 40q-2-12 4-18M24 40q0-14 6-20M34 40q2-12-2-20M44 40q2-10 6-14" stroke="#3f8f46" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="20" cy="22" r="3" fill="#7cc46b"/><circle cx="30" cy="20" r="3" fill="#a3d977"/><circle cx="32" cy="20" r="2" fill="#e85d75"/><circle cx="50" cy="26" r="3" fill="#7cc46b"/>`,
  steinbank: (g, s, l) => `<path d="M8 32h48v8H8Z" fill="${g}"/><path d="M12 40h6v12h-6ZM46 40h6v12h-6Z" fill="${s}"/><path d="M14 14v18M50 14v18" stroke="${s}" stroke-width="4"/><path d="M6 14h52" stroke="${l}" stroke-width="3"/><circle cx="8" cy="14" r="5" fill="${s}"/><circle cx="56" cy="14" r="5" fill="${s}"/>`,
  vorratskammer: (g, s, l) => `<path d="M10 20 32 8l22 12v32H10Z" fill="${g}"/><path d="M10 20 32 8l22 12" fill="none" stroke="${l}" stroke-width="3"/><path d="M26 36h12v16H26Z" fill="${s}"/><circle cx="18" cy="44" r="5" fill="#c98a3a"/><circle cx="46" cy="44" r="5" fill="#c98a3a"/><path d="M15 44h6M43 44h6" stroke="${K}" stroke-width="1.5"/>`,
  klimmzugbalken: (g, s, l) => `<path d="M12 52V14M52 52V14" stroke="${s}" stroke-width="6"/><path d="M8 14h48" stroke="${g}" stroke-width="6" stroke-linecap="round"/><path d="M8 12h48" stroke="${l}" stroke-width="2"/><path d="M6 52h14M44 52h14" stroke="${s}" stroke-width="4"/>`,
  statue: (g, s, l) => `<path d="M18 50h28v6H18Z" fill="${s}"/><circle cx="32" cy="14" r="6" fill="${g}"/><path d="M20 26q12-8 24 0l-3 12h-4l-1 12h-8l-1-12h-4Z" fill="${g}"/><path d="M14 22q4 4 8 4M50 22q-4 4-8 4" stroke="${g}" stroke-width="5" stroke-linecap="round"/><path d="M24 26q8-4 16 0" stroke="${l}" stroke-width="2" fill="none"/>`,
  chronikhaus: (g, s, l) => `<path d="M8 24 32 10l24 14v28H8Z" fill="${g}"/><path d="M8 24 32 10l24 14" fill="none" stroke="${l}" stroke-width="3"/><path d="M18 30h10v14H18ZM36 30h10v14H36Z" fill="${s}"/><path d="M20 32h6M20 36h6M38 32h6M38 36h6" stroke="#f0e2c0" stroke-width="1.5"/>`,
  wachturm: (g, s, l) => `<path d="M22 20h20v34H22Z" fill="${g}"/><path d="M18 12h28v8H18Z" fill="${s}"/><path d="M18 12v-4h5v4M27 12v-4h5v4M36 12v-4h5v4" fill="${s}"/><path d="M29 30h6v8h-6Z" fill="#ffd27a"/><path d="M22 20h20v3H22Z" fill="${l}"/>`,
  trophaeenhalle: (g, s, l) => `<path d="M6 26 32 12l26 14Z" fill="${l}"/><path d="M10 26h44v26H10Z" fill="${g}"/><path d="M14 28h4v24h-4ZM46 28h4v24h-4Z" fill="${s}"/><path d="M26 34h12v4a6 6 0 0 1-12 0Z" fill="#ffd27a"/><path d="M32 44v4M28 50h8" stroke="#ffd27a" stroke-width="2"/>`,
};

/** SVG eines Bauwerks in einer Stufe (0 = Grundriss / noch nicht gebaut). */
export function bauwerkSvg(id, stufe, groesse = 64) {
  const [g, s, l] = MATERIAL[stufe] ?? MATERIAL[0];
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('width', groesse);
  svg.setAttribute('height', groesse);
  svg.setAttribute('class', `bauwerk${stufe ? '' : ' ungebaut'}${stufe === 5 ? ' legendaer' : ''}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<g stroke="${K}" stroke-width="1.6" stroke-linejoin="round">${(FORMEN[id] ?? FORMEN.banner)(g, s, l)}</g>`;
  return svg;
}
