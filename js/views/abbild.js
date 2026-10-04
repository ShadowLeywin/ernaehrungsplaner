// Dein Abbild: Figur, die sich an Größe, Gewicht, Maße und Ränge anpasst (Heldenbogen).
import { el } from '../ui.js';
import { koerperbau, letzteMasse, letztesGewicht } from '../logic/abbild.js';

/** Liefert { svg, bau, quelle } für den Spielstand. */
export function abbildAus(s) {
  const k = s.profil.koerper ?? {};
  const bau = koerperbau({
    geschlecht: s.geschlecht ?? k.geschlecht,
    groesseCm: k.groesseCm,
    gewichtKg: letztesGewicht(s.tage, k.gewichtKg),
    masse: letzteMasse(s.tage),
    rangAnteil: Math.min(1, s.raenge.gesamt?.wertung ?? 0),
  });
  const farbe = s.raenge.gesamt?.rang.farbe ?? '#f97316';
  const aura = Math.min(0.85, 0.25 + s.level.level / 60);
  return { svg: abbildSvg(bau, farbe, aura), bau };
}

/** Stilisierte Schattenfigur mit Glut-Konturen. */
export function abbildSvg(b, farbe = '#f97316', aura = 0.4) {
  const L = (x) => (100 - x).toFixed(1);
  const R = (x) => (100 + x).toFixed(1);
  const sch = b.schulter;
  const torso = `M${L(sch)},96 Q${L(sch + 2)},135 ${L(b.taille)},190 L${L(b.huefte)},224 L${R(b.huefte)},224 L${R(b.taille)},190
    Q${R(sch + 2)},135 ${R(sch)},96 Q100,82 ${L(sch)},96 Z`;
  const arm = (s) => {
    const x0 = 100 + s * (sch - b.arm * 0.2);
    const x1 = 100 + s * (sch + b.arm * 0.35);
    const x2 = 100 + s * (sch + b.arm * 0.3);
    return `<path d="M${x0},104 L${x1},168" stroke-width="${b.arm * 2}"/><path d="M${x1},168 L${x2},232" stroke-width="${b.arm * 1.55}"/>`;
  };
  const bein = (s) => {
    const x0 = 100 + s * b.huefte * 0.5;
    const x1 = 100 + s * (b.huefte * 0.48 + 2);
    const x2 = 100 + s * (b.huefte * 0.45 + 3);
    return `<path d="M${x0},226 L${x1},312" stroke-width="${b.bein * 2}"/><path d="M${x1},312 L${x2},392" stroke-width="${b.bein * 1.25}"/>`;
  };
  const d = b.definition;
  const linien = d > 0.15 ? `<g class="abbild-def" style="opacity:${(0.25 + d * 0.6).toFixed(2)}">
      <path d="M${L(sch * 0.75)},118 Q100,${130 + d * 4} ${R(sch * 0.75)},118"/><path d="M100,104 L100,186"/>
      ${d > 0.35 ? [146, 160, 174].map((y) => `<path d="M${L(b.taille * 0.45)},${y} L${R(b.taille * 0.45)},${y}"/>`).join('') : ''}
    </g>` : '';
  const bauch = b.bauch > 0.2 ? `<ellipse cx="100" cy="182" rx="${(b.taille * (0.85 + b.bauch * 0.25)).toFixed(1)}" ry="${(18 + b.bauch * 14).toFixed(1)}" class="abbild-koerper"/>` : '';
  return `<svg viewBox="0 0 200 410" class="abbild" role="img" aria-label="Dein Abbild">
    <defs><radialGradient id="abbild-aura"><stop offset="0" stop-color="${farbe}" stop-opacity="${aura}"/><stop offset="1" stop-color="${farbe}" stop-opacity="0"/></radialGradient></defs>
    <ellipse cx="100" cy="200" rx="98" ry="200" fill="url(#abbild-aura)" class="abbild-aura"/>
    <g class="abbild-glieder">${arm(-1)}${arm(1)}${bein(-1)}${bein(1)}</g>
    <rect x="${(100 - 8 - b.schulter * 0.08).toFixed(1)}" y="64" width="${(16 + b.schulter * 0.16).toFixed(1)}" height="30" rx="6" class="abbild-koerper"/>
    <path d="${torso}" class="abbild-koerper"/>${bauch}
    <circle cx="${L(sch - b.arm * 0.3)}" cy="104" r="${(b.arm * 1.25).toFixed(1)}" class="abbild-koerper"/><circle cx="${R(sch - b.arm * 0.3)}" cy="104" r="${(b.arm * 1.25).toFixed(1)}" class="abbild-koerper"/>
    <ellipse cx="100" cy="46" rx="17" ry="22" class="abbild-koerper"/>
    ${linien}
  </svg>`;
}

/** Karte für den Heldenbogen. */
export function abbildKarte(s) {
  const { svg, bau } = abbildAus(s);
  const rahmen = el('div', { class: 'abbild-rahmen' });
  rahmen.innerHTML = svg;
  return el('section', { class: 'karte abbild-karte' },
    el('h2', {}, 'Dein Abbild'),
    rahmen,
    el('p', { class: 'leise klein' }, bau.schaetzung
      ? 'Geschätzt aus Größe, Gewicht und deinen Rängen. Trag Brust und Taille unter „Maße“ ein, dann passt sich die Figur genauer an.'
      : 'Aus deinen letzten Maßen, deinem Gewicht und deinen Rängen. Die Aura wächst mit deinem Level.'),
    el('a', { class: 'knopf zweitrangig voll', href: '#/masse' }, 'Maße eintragen'));
}
