// Platzhalter-Bild für Rezepte: ein Symbol und ein Farbton, abgeleitet aus dem Namen. Reine Funktion.
// Kein Foto nötig, und dasselbe Rezept sieht überall gleich aus (Liste, Detail).

import { normalisiere } from './suche.js';

/** Stichwort am Wortanfang → Symbol und passender Farbton. Reihenfolge zählt: Das erste passende Stichwort gewinnt. */
const SYMBOLE = [
  [['chili'], '🌶️', 'grapefruit'],
  [['curry', 'dal'], '🍛', 'mandarine'],
  [['suppe', 'eintopf', 'brühe', 'bruhe'], '🍲', 'mandarine'],
  [['salat', 'bowl'], '🥗', 'limette'],
  [['pasta', 'nudel', 'spaghetti', 'lasagne', 'penne'], '🍝', 'zitrone'],
  [['pizza'], '🍕', 'grapefruit'],
  [['burger'], '🍔', 'mandarine'],
  [['wrap', 'burrito'], '🌯', 'zitrone'],
  [['taco'], '🌮', 'zitrone'],
  [['reis', 'risotto', 'paella'], '🍚', 'zitrone'],
  [['porridge', 'hafer', 'oats', 'müsli', 'musli', 'granola'], '🥣', 'zitrone'],
  [['omelett', 'rührei', 'ruhrei', 'ei', 'eier', 'shakshuka'], '🍳', 'zitrone'],
  [['lachs', 'fisch', 'thunfisch', 'garnele'], '🐟', 'wasser'],
  [['hähnchen', 'hahnchen', 'huhn', 'chicken', 'pute'], '🍗', 'mandarine'],
  [['rind', 'steak', 'hack'], '🥩', 'grapefruit'],
  [['shake', 'smoothie'], '🥤', 'heidelbeere'],
  [['pfannkuchen', 'pancake', 'waffel'], '🥞', 'zitrone'],
  [['kuchen', 'muffin', 'brownie', 'cookie', 'keks'], '🧁', 'heidelbeere'],
  [['brot', 'toast', 'sandwich', 'stulle'], '🥪', 'zitrone'],
  [['kartoffel', 'pommes'], '🥔', 'zitrone'],
  [['quark', 'joghurt', 'skyr'], '🥛', 'wasser'],
  [['tofu', 'tempeh', 'linsen', 'bohnen', 'kichererbsen'], '🫘', 'mandarine'],
  [['gemüse', 'gemuse', 'pfanne', 'ofengemüse', 'ofengemuse'], '🥦', 'limette'],
];

/** Farbtöne aus css/app.css, in die das Rezept fällt. */
export const REZEPT_FARBEN = ['grapefruit', 'zitrone', 'mandarine', 'avocado', 'heidelbeere', 'wasser', 'limette'];

/** Kleiner, stabiler Streuwert: gleicher Name, gleiche Farbe. */
function streuwert(text) {
  let h = 0;
  for (const zeichen of text) h = (h * 31 + zeichen.codePointAt(0)) >>> 0;
  return h;
}

/** { symbol, farbe } für einen Rezeptnamen. Ohne passendes Stichwort: Teller. */
export function rezeptBild(name) {
  const woerter = normalisiere(name).split(' ').filter(Boolean);
  // normalisiere macht aus "ü" ein "u"; die Stichwörter oben stehen deshalb in beiden Schreibweisen
  const passt = (stichwort) => {
    const s = normalisiere(stichwort);
    return woerter.some((w) => w.startsWith(s));
  };
  const treffer = SYMBOLE.find(([stichwoerter]) => stichwoerter.some(passt));
  return {
    symbol: treffer ? treffer[1] : '🍽️',
    // Bekanntes Gericht: Farbe passt zum Symbol (Chili rot, Fisch blau). Sonst stabil aus dem Namen.
    farbe: treffer ? treffer[2] : REZEPT_FARBEN[streuwert(normalisiere(name)) % REZEPT_FARBEN.length],
  };
}
