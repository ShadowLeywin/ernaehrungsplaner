// Dein Abbild: anatomische Figur (vorn/hinten), die sich an Größe, Gewicht, Maße und Ränge anpasst.
// Grundlage sind die Muskelpfade der Körperansicht; sie werden je Körperzone verbreitert oder verschmälert.
import { el } from '../ui.js';
import { koerperbau, letzteMasse, letztesGewicht } from '../logic/abbild.js';
import { GRUPPEN, rangName } from '../logic/raenge.js';
import { VORN, HINTEN, UMRISS_RECHTS } from './koerper.js';

// Bezugswerte eines durchschnittlichen Körperbaus (koerperbau() bei mittleren Werten)
const BASIS = { schulter: 50, taille: 30, huefte: 32, arm: 10, bein: 16 };
const lerp = (a, b, t) => a + (b - a) * Math.min(1, Math.max(0, t));

/** Verformt einen Punkt der rechten Körperhälfte (d = Abstand zur Mitte) je nach Zone. */
function verformer(bau) {
  const sS = bau.schulter / BASIS.schulter;
  const wS = bau.taille / BASIS.taille;
  const hS = bau.huefte / BASIS.huefte;
  const aS = bau.arm / BASIS.arm;
  const lS = bau.bein / BASIS.bein;
  const frau = bau.frau;
  return (d, y) => {
    if (y < 66) return d * lerp(1, Math.sqrt(sS), (y - 56) / 10);
    // Arm (inkl. Hand): Mitte wandert mit der Schulter, Dicke nach Oberarm
    if (d > 31 && y >= 108 && y < 216) {
      const mitte = 45 * sS;
      return mitte + (d - 45) * aS;
    }
    if (y < 120) return d * lerp(Math.sqrt(sS), sS, (y - 66) / 30) * (frau ? 0.92 : 1);
    if (y < 200) {
      const brust = lerp(sS * 0.55 + 0.45, wS, (y - 120) / 70);
      return d * brust * (frau ? lerp(0.92, 1.06, (y - 130) / 60) : 1);
    }
    if (y < 216) return d * lerp(wS, hS, (y - 200) / 16) * (frau ? 1.06 : 1);
    // Beine: Mitte mit der Hüfte, Dicke nach Oberschenkel (unten etwas weniger)
    const mitte = 21 * hS * (frau ? 1.05 : 1);
    const dicke = lerp(lS, Math.sqrt(lS), (y - 300) / 80);
    return mitte + (d - 21) * dicke;
  };
}

function pfadVerformen(pfad, f, spiegeln) {
  return pfad.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, xs, ys) => {
    const y = Number(ys);
    const d = f(Math.abs(Number(xs) - 100), y);
    const x = Number(xs) >= 100 !== spiegeln ? 100 + d : 100 - d;
    return `${x.toFixed(1)},${y}`;
  });
}

function umriss(f) {
  const rechts = UMRISS_RECHTS.map(([x, y]) => [100 + f(x - 100, y), y]);
  const links = rechts.slice(1, -1).reverse().map(([x, y]) => [200 - x, y]);
  return `M${[...rechts, ...links].map(([x, y]) => `${x.toFixed(1)},${y}`).join(' L')} Z`;
}

/** SVG einer Ansicht; muskelStil(m) liefert { farbe, deckkraft }. */
export function abbildSvg(bau, ansicht, muskelStil, auraFarbe = '#f97316', aura = 0.4) {
  const f = verformer(bau);
  const formen = ansicht === 'vorn' ? VORN : HINTEN;
  const def = bau.definition;
  const muskeln = Object.entries(formen).map(([m, pfade]) => {
    const { farbe, deckkraft } = muskelStil(m);
    const d = pfade.flatMap((p) => [pfadVerformen(p, f, false), pfadVerformen(p, f, true)]).map((x) => `<path d="${x}"/>`).join('');
    return `<g style="fill:${farbe};fill-opacity:${deckkraft.toFixed(2)}" class="abbild-muskel">${d}</g>`;
  }).join('');
  const bauch = bau.bauch > 0.3 && ansicht === 'vorn'
    ? `<ellipse cx="100" cy="168" rx="${(f(26, 175) * (0.9 + bau.bauch * 0.25)).toFixed(1)}" ry="${(22 + bau.bauch * 14).toFixed(1)}" class="abbild-bauch" style="opacity:${(0.35 + bau.bauch * 0.5).toFixed(2)}"/>`
    : '';
  const id = `aura-${ansicht}`;
  return `<svg viewBox="20 0 160 420" class="abbild" role="img" aria-label="Dein Abbild ${ansicht === 'vorn' ? 'von vorn' : 'von hinten'}" style="--definition:${(0.25 + def * 0.75).toFixed(2)}">
    <defs><radialGradient id="${id}"><stop offset="0" stop-color="${auraFarbe}" stop-opacity="${aura.toFixed(2)}"/><stop offset="1" stop-color="${auraFarbe}" stop-opacity="0"/></radialGradient></defs>
    <ellipse cx="100" cy="210" rx="80" ry="210" fill="url(#${id})" class="abbild-aura"/>
    <ellipse cx="100" cy="36" rx="${bau.frau ? 18 : 19}" ry="24" class="abbild-haut"/>
    <path d="${umriss(f)}" class="abbild-haut"/>
    ${muskeln}${bauch}
  </svg>`;
}

/** Karte für den Heldenbogen. */
export function abbildKarte(s) {
  const k = s.profil.koerper ?? {};
  const bau = koerperbau({
    geschlecht: s.geschlecht ?? k.geschlecht,
    groesseCm: k.groesseCm,
    gewichtKg: letztesGewicht(s.tage, k.gewichtKg),
    masse: letzteMasse(s.tage),
    rangAnteil: Math.min(1, s.raenge.gesamt?.wertung ?? 0),
  });
  const gruppeVon = Object.fromEntries(Object.entries(GRUPPEN).flatMap(([g, x]) => x.muskeln.map((m) => [m, g])));
  const muskelStil = (m) => {
    const r = s.raenge.gruppen[gruppeVon[m]];
    if (!r) return { farbe: 'var(--text-leise)', deckkraft: 0.12 };
    return { farbe: r.rang.farbe, deckkraft: 0.45 + Math.min(1, r.wertung) * 0.5 };
  };
  const auraFarbe = s.raenge.gesamt?.rang.farbe ?? '#f97316';
  const aura = Math.min(0.85, 0.2 + s.level.level / 60);
  const rahmen = el('div', { class: 'abbild-rahmen' });
  rahmen.innerHTML = abbildSvg(bau, 'vorn', muskelStil, auraFarbe, aura) + abbildSvg(bau, 'hinten', muskelStil, auraFarbe, aura);
  const gewertet = Object.entries(GRUPPEN).filter(([g]) => s.raenge.gruppen[g]);
  return el('section', { class: 'karte abbild-karte' },
    el('h2', {}, 'Dein Abbild'),
    rahmen,
    gewertet.length ? el('div', { class: 'chips abbild-legende' }, ...gewertet.map(([g, x]) => {
      const r = s.raenge.gruppen[g];
      return el('span', { class: 'marke', style: `border-color:${r.rang.farbe};color:inherit` },
        el('span', { class: 'punkt', style: `background:${r.rang.farbe}` }), `${x.name}: ${rangName(r)}`);
    })) : null,
    el('p', { class: 'leise klein' }, bau.schaetzung
      ? 'Die Figur ist aus Größe, Gewicht und deinen Rängen geschätzt. Trag Brust, Taille, Oberarm und Oberschenkel unter „Maße“ ein, dann passt sie sich genauer an. Muskelfarbe = Rang der Muskelgruppe, die Aura wächst mit deinem Level.'
      : 'Aus deinen letzten Maßen, deinem Gewicht und deinen Rängen. Muskelfarbe = Rang der Muskelgruppe, die Aura wächst mit deinem Level.'),
    el('a', { class: 'knopf zweitrangig voll', href: '#/masse' }, 'Maße eintragen'));
}
