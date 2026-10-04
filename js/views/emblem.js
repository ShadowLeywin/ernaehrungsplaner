// Grafiken der Spiel-Ebene: Rang-Wappen, Erfolgs-Medaille, Werte-Netz (alles SVG, offline).
import { STUFEN_TEXT } from '../logic/raenge.js';

const SVG = 'http://www.w3.org/2000/svg';
let zaehler = 0;

function svgElement(viewBox, groesse, klasse) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('width', groesse);
  svg.setAttribute('height', groesse);
  svg.setAttribute('class', klasse);
  return svg;
}

/** Rang-Wappen: Schild in Rangfarbe, Stufe als römische Zahl, Legende mit Flamme. r: Ergebnis von rangAus oder null */
export function rangEmblem(r, groesse = 56) {
  const svg = svgElement('0 0 64 72', groesse, 'rang-emblem');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', r ? `${r.rang.name}${r.stufe ? ` ${STUFEN_TEXT[r.stufe]}` : ''}` : 'Unplatziert');
  const id = `re${zaehler += 1}`;
  const farbe = r?.rang.farbe ?? '#555';
  const legende = r?.rang.id === 'legende';
  const stufe = r?.stufe ? STUFEN_TEXT[r.stufe] : '';
  svg.innerHTML = `
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${farbe}" stop-opacity="1"/>
        <stop offset="1" stop-color="${farbe}" stop-opacity=".55"/>
      </linearGradient>
    </defs>
    <path d="M32 2 60 12v22c0 18-12 30-28 36C16 64 4 52 4 34V12Z" fill="url(#${id})" stroke="${farbe}" stroke-width="2"/>
    <path d="M32 9 53 16.5v17c0 13.5-9 23-21 27.8C20 56.5 11 47 11 33.5v-17Z" fill="rgba(0,0,0,.28)"/>
    ${r ? (legende
    ? '<path d="M32 54c-8 0-12-5-10.5-11 1.3-4.7 5.3-7 6.3-11.6 1.9 3 2.8 4.7 3.4 6.3.3-4.7 2.2-9.4 5-12.3.6 6 6 9.8 7.2 16 1.3 6.9-2.8 12.6-11.4 12.6Z" fill="#ffd27a"/>'
    : `<path d="m32 18 3.6 7.4 8.1 1.1-5.9 5.7 1.4 8-7.2-3.8-7.2 3.8 1.4-8-5.9-5.7 8.1-1.1Z" fill="rgba(255,255,255,.9)"/>
       <text x="32" y="56" text-anchor="middle" font-size="12" font-weight="800" fill="#fff" font-family="system-ui, sans-serif">${stufe}</text>`)
    : '<text x="32" y="42" text-anchor="middle" font-size="18" font-weight="800" fill="rgba(255,255,255,.7)" font-family="system-ui, sans-serif">?</text>'}`;
  return svg;
}

/** Medaille für eine Erfolgsstufe; ohne Stufe grau, geheim mit Fragezeichen. */
export function medaille(stufenInfo, groesse = 44, geheim = false, verborgen = false) {
  const svg = svgElement('0 0 48 48', groesse, 'medaille');
  const farbe = stufenInfo?.farbe ?? '#5b5450';
  const id = `me${zaehler += 1}`;
  svg.innerHTML = `
    <defs><radialGradient id="${id}" cx="35%" cy="30%" r="75%">
      <stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="${farbe}"/><stop offset="1" stop-color="${farbe}" stop-opacity=".7"/>
    </radialGradient></defs>
    <circle cx="24" cy="24" r="21" fill="url(#${id})" stroke="${farbe}" stroke-width="2" opacity="${stufenInfo ? 1 : 0.45}"/>
    <circle cx="24" cy="24" r="15" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="1.5" stroke-dasharray="2 3"/>
    ${verborgen
    ? '<text x="24" y="30" text-anchor="middle" font-size="17" font-weight="800" fill="rgba(255,255,255,.8)" font-family="system-ui, sans-serif">?</text>'
    : geheim
      ? '<path d="M24 13l3 7 7.5.6-5.7 4.9 1.8 7.3L24 29l-6.6 3.8 1.8-7.3-5.7-4.9 7.5-.6Z" fill="rgba(255,255,255,.9)"/>'
      : '<path d="M17 18h14v4a7 7 0 0 1-14 0Zm7 11v4m-4 3h8" stroke="rgba(255,255,255,.92)" stroke-width="2.4" fill="none" stroke-linecap="round"/>'}`;
  return svg;
}

/** Netzdiagramm der sechs Werte. werte: { id: 1–100 }, namen: { id: { kurz } } */
export function werteNetz(werte, namen, groesse = 240) {
  const svg = svgElement('0 0 240 240', groesse, 'werte-netz');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', Object.entries(werte).map(([k, v]) => `${namen[k].name} ${v}`).join(', '));
  const ids = Object.keys(namen);
  const mitte = 120;
  const radius = 84;
  const punkt = (i, anteil) => {
    const winkel = -Math.PI / 2 + (i / ids.length) * Math.PI * 2;
    return [mitte + Math.cos(winkel) * radius * anteil, mitte + Math.sin(winkel) * radius * anteil];
  };
  const ring = (anteil) => ids.map((_, i) => punkt(i, anteil).map((z) => z.toFixed(1)).join(',')).join(' ');
  const werteForm = ids.map((id, i) => punkt(i, Math.max(0.04, (werte[id] ?? 0) / 100)).map((z) => z.toFixed(1)).join(',')).join(' ');
  svg.innerHTML = `
    ${[0.25, 0.5, 0.75, 1].map((a) => `<polygon points="${ring(a)}" class="netz-ring"/>`).join('')}
    ${ids.map((_, i) => { const [x, y] = punkt(i, 1); return `<line x1="${mitte}" y1="${mitte}" x2="${x}" y2="${y}" class="netz-ring"/>`; }).join('')}
    <polygon points="${werteForm}" class="netz-werte"/>
    ${ids.map((id, i) => { const [x, y] = punkt(i, Math.max(0.04, (werte[id] ?? 0) / 100)); return `<circle cx="${x}" cy="${y}" r="3.5" class="netz-punkt"/>`; }).join('')}
    ${ids.map((id, i) => {
    const [x, y] = punkt(i, 1.22);
    return `<text x="${x}" y="${y - 2}" text-anchor="middle" class="netz-text">${namen[id].kurz}</text>
            <text x="${x}" y="${y + 11}" text-anchor="middle" class="netz-zahl">${werte[id] ?? 0}</text>`;
  }).join('')}`;
  return svg;
}
