// Brom: Maskottchen – halb Schmied, halb Zwerg, gedrungen und sehr muskulös, Vollbart, ganz normale
// Alltagskleidung (T-Shirt, Jeans). Verkündet Erfolge wie ein Herold, knapp und respektvoll.
// Nie Push-Nachrichten; erscheint nur in der App und lässt sich abschalten.
import { el, setze } from '../ui.js';
import { icon } from '../icons.js';
import { episch } from '../darstellung.js';

const SCHLUESSEL = 'brom';

export function bromAn() {
  try { return localStorage.getItem(SCHLUESSEL) !== 'aus'; } catch { return true; }
}

export function setzeBromAn(an) {
  try { localStorage.setItem(SCHLUESSEL, an ? 'an' : 'aus'); } catch { /* nur diese Sitzung */ }
}

/** Brom als SVG. stimmung: 'ruhig' | 'stolz' (Hammer erhoben) */
export function bromSvg(groesse = 96, stimmung = 'ruhig') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 120 150');
  svg.setAttribute('width', groesse);
  svg.setAttribute('height', Math.round(groesse * 1.25));
  svg.setAttribute('class', `brom brom-${stimmung}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Brom, der Schmied');
  const haut = '#d99a6c';
  const hautSchatten = '#b8774c';
  const bart = '#a4471e';
  const bartDunkel = '#7c3313';
  const shirt = '#4a515e';
  const shirtSchatten = '#363c47';
  const jeans = '#34507c';
  const jeansDunkel = '#263c5e';
  svg.innerHTML = `
    <ellipse cx="60" cy="146" rx="40" ry="4" fill="#000" opacity=".18"/>
    <!-- Hammer über der Schulter -->
    <g class="brom-hammer">
      <rect x="86" y="14" width="5" height="50" rx="2" fill="#7a5233" transform="rotate(-38 88 60)"/>
      <rect x="60" y="14" width="24" height="14" rx="3" fill="#5c6470" transform="rotate(-38 88 60)"/>
      <rect x="60" y="14" width="24" height="4" rx="2" fill="#8a929e" transform="rotate(-38 88 60)"/>
    </g>
    <!-- Beine in Jeans, Stiefel -->
    <path d="M42 108h17l-1 32H43z" fill="${jeans}"/>
    <path d="M61 108h17l-1 32H62z" fill="${jeans}"/>
    <path d="M59 110h2v28h-2z" fill="${jeansDunkel}"/>
    <rect x="38" y="137" width="22" height="8" rx="4" fill="#5b3a24"/>
    <rect x="60" y="137" width="22" height="8" rx="4" fill="#5b3a24"/>
    <!-- Gürtel -->
    <rect x="38" y="102" width="44" height="8" rx="2" fill="#3a2a1e"/>
    <rect x="56" y="103" width="8" height="6" rx="1" style="fill:var(--akzent)"/>
    <!-- Linker Arm (hängend, Faust) -->
    <ellipse cx="20" cy="84" rx="10" ry="13" fill="${haut}"/>
    <ellipse cx="17" cy="82" rx="4" ry="6" fill="#e8b48a" opacity=".6"/>
    <ellipse cx="19" cy="104" rx="8" ry="11" fill="${haut}"/>
    <circle cx="19" cy="117" r="6.5" fill="${hautSchatten}"/>
    <!-- Rechter Arm (angewinkelt, hält den Hammer) -->
    <ellipse cx="101" cy="82" rx="10" ry="13" fill="${haut}" transform="rotate(-12 101 82)"/>
    <ellipse cx="103" cy="66" rx="7.5" ry="12" fill="${haut}" transform="rotate(14 103 66)"/>
    <circle cx="99" cy="55" r="6.5" fill="${hautSchatten}"/>
    <!-- Rumpf im T-Shirt, kurze gespannte Ärmel -->
    <path d="M26 64q6-11 20-12h28q14 1 20 12l-6 42q-28 8-56 0z" fill="${shirt}"/>
    <path d="M26 64q-7 6-8 16l13 3 4-16z" fill="${shirt}"/>
    <path d="M94 64q7 6 9 15l-13 4-4-16z" fill="${shirt}"/>
    <path d="M40 80q10 6 20 0q10 6 20 0" fill="none" stroke="${shirtSchatten}" stroke-width="2" stroke-linecap="round"/>
    <path d="M44 92q16 5 32 0" fill="none" stroke="${shirtSchatten}" stroke-width="1.5" stroke-linecap="round" opacity=".7"/>
    <!-- kleines Flammen-Logo auf dem Shirt -->
    <path d="M80 86c-2.4 0-3.5-1.6-3-3.3.4-1.4 1.6-2 1.9-3.4.6.9.8 1.4 1 1.9.1-1.4.7-2.8 1.5-3.6.2 1.8 1.8 2.9 2.1 4.8.4 2-.8 3.6-3.5 3.6Z" style="fill:var(--akzent)"/>
    <!-- Nacken, Kopf -->
    <rect x="49" y="42" width="22" height="14" rx="5" fill="${hautSchatten}"/>
    <circle cx="46" cy="33" r="3.5" fill="${hautSchatten}"/>
    <circle cx="74" cy="33" r="3.5" fill="${hautSchatten}"/>
    <ellipse cx="60" cy="31" rx="14" ry="15" fill="${haut}"/>
    <path d="M46 28q1-14 14-14t14 14q-5-6-14-6t-14 6z" fill="${bartDunkel}"/>
    <!-- Brauen, Augen, Nase -->
    <path d="M50 27.5q4-3 8-.5M62 27q4-2.5 8 .5" stroke="${bartDunkel}" stroke-width="2.6" stroke-linecap="round" fill="none"/>
    <circle cx="54.5" cy="31.5" r="1.6" fill="#2b1d16"/>
    <circle cx="65.5" cy="31.5" r="1.6" fill="#2b1d16"/>
    <ellipse cx="60" cy="36.5" rx="3.6" ry="3.2" fill="${hautSchatten}"/>
    <!-- Vollbart mit Ring -->
    <path d="M46 33q0 15 4 24 5 14 10 18 5-4 10-18 4-9 4-24-4 10-14 10t-14-10z" fill="${bart}"/>
    <path d="M51 41q4.5-3.5 9-1.2 4.5-2.3 9 1.2-4.5 3-9 1.3-4.5 1.7-9-1.3z" fill="${bartDunkel}"/>
    <path d="M56.5 45.5q3.5 1.6 7 0" stroke="#5e2a12" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    <path d="M55 52q5 4 10 0M54 60q6 4 12 0" stroke="${bartDunkel}" stroke-width="1.2" fill="none" opacity=".7"/>
    <rect x="56.5" y="66" width="7" height="4" rx="1.5" style="fill:var(--akzent)"/>`;
  return svg;
}

const HEROLD_SAETZE = [
  (n, s) => `Hört, hört! „${n}“ ist errungen – Stufe ${s}.`,
  (n, s) => `Bei meinem Amboss: „${n}“, Stufe ${s}. Gut geschmiedet.`,
  (n, s) => `Das Feuer lodert höher: „${n}“ (${s}).`,
  (n, s) => `Kunde aus der Schmiede: „${n}“ in ${s}. Weiter so.`,
];

/**
 * Verkündet Neuigkeiten unten über der Navigation. Kein Dialog, blockiert nichts, verschwindet von selbst.
 * meldungen: [{ titel, text, farbe? }]
 */
export function zeigeHerold(meldungen) {
  if (!meldungen.length) return;
  document.querySelector('.herold')?.remove();
  const mitBrom = bromAn() && document.documentElement.dataset.stil !== 'schlicht';
  const karte = el('div', { class: `herold${mitBrom ? ' mit-brom' : ''}`, role: 'status', 'aria-live': 'polite' });
  const schliessen = () => { karte.classList.add('weg'); setTimeout(() => karte.remove(), 300); };
  const erste = meldungen.slice(0, 3);
  setze(karte,
    mitBrom ? el('div', { class: 'herold-brom' }, bromSvg(64, 'stolz')) : el('div', { class: 'herold-icon' }, icon('pokal', 26)),
    el('div', { class: 'herold-text' },
      el('strong', {}, mitBrom ? 'Brom verkündet' : episch('Neuer Erfolg', 'Neuer Erfolg')),
      ...erste.map((m) => el('p', {}, m.farbe ? el('span', { class: 'herold-punkt', style: `background:${m.farbe}` }) : null, m.text)),
      meldungen.length > 3 ? el('p', { class: 'leise klein' }, `… und ${meldungen.length - 3} weitere`) : null,
      el('a', { href: '#/erfolge', class: 'klein', onclick: schliessen }, 'Ansehen →')),
    el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Schließen', onclick: schliessen }, icon('schliessen', 18)));
  document.body.append(karte);
  setTimeout(schliessen, 9000);
}

/** Text für einen neuen Erfolg (episch mit Brom, sonst schlicht). */
export function heroldSatz(name, stufe, index = 0) {
  return episch(HEROLD_SAETZE[index % HEROLD_SAETZE.length](name, stufe), `${name} – ${stufe}`);
}
