// Brom als Zeichnung: sitzt auf einem Baumstamm am Lagerfeuer (Feuer links von ihm), massiger Zwergenschmied
// in T-Shirt und Jeans, geflochtener Vollbart mit Goldringen, Hammer am Stamm, Aura und Feuerschein.
// Alles SVG, Farben der Aura folgen dem Farbthema (--akzent).

// Haut warm vom Feuer beleuchtet: hell auf der Feuerseite (links), dunkler im Schatten (rechts)
const F = {
  haut: '#d4935f', hautHell: '#f3b886', hautDunkel: '#9c5f37', hautTief: '#6e3e22',
  bart: '#a3431b', bartHell: '#d6692f', bartDunkel: '#5e2410',
  shirt: '#3a3f4a', shirtHell: '#5d6575', shirtDunkel: '#22262e',
  jeans: '#2f4a73', jeansHell: '#4a6d9b', jeansDunkel: '#1f3352',
  stiefel: '#4a2d1a', stiefelDunkel: '#2a180c', holz: '#5a361f', holzHell: '#8a5a34', metall: '#8d96a3', gold: '#d6a845',
};

/** SVG-Markup von Brom im Raster 210 × 222. id macht Verläufe eindeutig, wenn Brom mehrfach auf der Seite ist. */
export function bromMarkup(id = 'b') {
  const g = (name) => `${id}-${name}`;
  const glut = Array.from({ length: 9 }, (_, i) => {
    const x = 70 + ((i * 47) % 120);
    return `<circle class="brom-glut" cx="${x}" cy="${150 - (i % 4) * 18}" r="${1 + (i % 3) * 0.5}" style="animation-delay:${(i * 0.53).toFixed(2)}s"/>`;
  }).join('');
  return `
  <defs>
    <radialGradient id="${g('aura')}" cx="50%" cy="48%" r="50%">
      <stop offset="0" style="stop-color:var(--akzent);stop-opacity:.55"/>
      <stop offset=".55" style="stop-color:var(--akzent-2);stop-opacity:.18"/>
      <stop offset="1" style="stop-color:var(--akzent-2);stop-opacity:0"/>
    </radialGradient>
    <linearGradient id="${g('haut')}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${F.hautHell}"/><stop offset=".45" stop-color="${F.haut}"/><stop offset="1" stop-color="${F.hautDunkel}"/>
    </linearGradient>
    <linearGradient id="${g('shirt')}" x1="0" y1="0" x2="1" y2=".3">
      <stop offset="0" stop-color="${F.shirtHell}"/><stop offset=".5" stop-color="${F.shirt}"/><stop offset="1" stop-color="${F.shirtDunkel}"/>
    </linearGradient>
    <linearGradient id="${g('jeans')}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${F.jeansHell}"/><stop offset=".6" stop-color="${F.jeans}"/><stop offset="1" stop-color="${F.jeansDunkel}"/>
    </linearGradient>
    <linearGradient id="${g('bart')}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${F.bartHell}"/><stop offset=".5" stop-color="${F.bart}"/><stop offset="1" stop-color="${F.bartDunkel}"/>
    </linearGradient>
    <linearGradient id="${g('holz')}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${F.holzHell}"/><stop offset="1" stop-color="${F.holz}"/>
    </linearGradient>
    <filter id="${g('weich')}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.6"/></filter>
    <filter id="${g('aura-blur')}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>

  <!-- Aura: pulsierendes Glühen, Lichtkranz um die Silhouette, aufsteigende Glut -->
  <ellipse class="brom-aura" cx="120" cy="118" rx="98" ry="108" fill="url(#${g('aura')})"/>
  <g class="brom-aura-kranz" filter="url(#${g('aura-blur')})">
    <path d="M96 30Q100 8 122 8q22 2 22 26q22 6 34 30 10 40-6 104l-60 6q-40-30-36-72 0-26 46-54Z" fill="none" style="stroke:var(--akzent)" stroke-width="7"/>
  </g>
  <g>${glut}</g>

  <!-- Baumstamm mit Jahresringen -->
  <path d="M64 166h118a11 14 0 0 1 0 28H64a11 14 0 0 1 0-28Z" fill="url(#${g('holz')})"/>
  <path d="M70 172q30-3 60 0t52 0M68 186q40 3 70 0t44 1" stroke="${F.holz}" stroke-width="1.5" fill="none" opacity=".8"/>
  <ellipse cx="182" cy="180" rx="11" ry="14" fill="#b07a4b"/>
  <ellipse cx="182" cy="180" rx="7" ry="9.5" fill="none" stroke="${F.holz}" stroke-width="1.2"/>
  <ellipse cx="182" cy="180" rx="3" ry="4.5" fill="none" stroke="${F.holz}" stroke-width="1.2"/>

  <!-- Schmiedehammer, an den Stamm gelehnt -->
  <path d="M190 202 179 120" stroke="#6b4426" stroke-width="5" stroke-linecap="round"/>
  <path d="M180 138l3 0M181 144l3 0M182 150l3 0M183 156l3 0" stroke="#3b2414" stroke-width="1.6"/>
  <g transform="rotate(-8 191 204)">
    <rect x="176" y="196" width="30" height="16" rx="3" fill="#4e5560"/>
    <rect x="176" y="196" width="30" height="4" rx="2" fill="${F.metall}"/>
  </g>

  <!-- Hinteres Bein -->
  <path d="M150 162Q120 150 94 141q-14 2-12 16 30 14 66 24Z" fill="${F.jeansDunkel}"/>
  <path d="M84 148q-8 26-6 52h20q0-25 2-50Z" fill="${F.jeansDunkel}"/>
  <path d="M72 197h28q8 0 8 9v7H66q-1-16 6-16Z" fill="${F.stiefelDunkel}"/>

  <!-- Vorderes Bein, abgewetztes Knie, Arbeitsstiefel -->
  <path d="M146 166Q108 156 74 150q-17 3-15 20 36 16 85 22Z" fill="url(#${g('jeans')})"/>
  <ellipse cx="70" cy="160" rx="9" ry="7" fill="${F.jeansHell}" opacity=".55"/>
  <path d="M61 162q-7 22-5 42h25q0-22 3-40Z" fill="url(#${g('jeans')})"/>
  <path d="M62 178q8 2 18 0M60 192q10 2 20 0" stroke="${F.jeansDunkel}" stroke-width="1" fill="none" opacity=".6"/>
  <path d="M48 201h36q9 0 9 10v6H40q0-16 8-16Z" fill="${F.stiefel}"/>
  <path d="M40 214h53" stroke="${F.stiefelDunkel}" stroke-width="3"/>
  <path d="M60 203v8M66 203v8M72 203v8" stroke="${F.stiefelDunkel}" stroke-width="1"/>

  <!-- Rumpf im gespannten T-Shirt -->
  <path d="M104 72Q126 52 158 58q24 8 20 40-3 36-20 72h-46Q98 140 96 110q-2-24 8-38Z" fill="url(#${g('shirt')})"/>
  <path d="M100 100q16 14 36 4M106 128q14 6 30 2M140 76q10 22 8 52" stroke="${F.shirtDunkel}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>
  <path d="M112 152q18 4 40 0" stroke="${F.shirtDunkel}" stroke-width="1.5" fill="none" opacity=".6"/>
  <path d="M104 84q14-8 32 2" stroke="${F.shirtHell}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".5"/>
  <path d="M170 80q6 30-4 60" stroke="${F.shirtHell}" stroke-width="1.6" fill="none" opacity=".35"/>
  <path d="M150 112c-3.4 0-5-2.3-4.3-4.7.6-2 2.3-2.9 2.7-4.9.8 1.3 1.2 2 1.4 2.7.1-2 1-4 2.1-5.1.3 2.6 2.6 4.1 3 6.8.5 2.8-1.1 5.2-4.9 5.2Z" style="fill:var(--akzent)" opacity=".85"/>

  <path d="M108 158q26 6 52-2l2 10q-27 8-56 2Z" fill="#2b1a10"/>
  <rect x="124" y="160" width="10" height="9" rx="2" fill="none" stroke="${F.gold}" stroke-width="2"/>

  <!-- Hinterer Unterarm (Hände vor dem Knie gefaltet) -->
  <path d="M124 120Q94 128 64 134l2 14q32-2 60-12Z" fill="${F.hautDunkel}"/>

  <!-- Nacken und Trapez -->
  <path d="M100 74q6-22 26-24 16 0 26 10-10 10-26 12-14 0-26 2Z" fill="url(#${g('haut')})"/>
  <path d="M102 74q12 4 26 2 14-2 24-10" stroke="${F.shirtDunkel}" stroke-width="3" fill="none" stroke-linecap="round"/>

  <g transform="translate(113 48) scale(1.16) translate(-119 -36)">
  <!-- Kopf: Glatze mit Haarkranz, schwere Brauen, Knollennase, Narbe, glühendes Auge -->
  <ellipse cx="119" cy="36" rx="20" ry="22" fill="url(#${g('haut')})"/>
  <path d="M136 26q6 10 2 24-4 6-8 4 4-12 0-24Z" fill="${F.bartDunkel}"/>
  <ellipse cx="134" cy="40" rx="4" ry="6" fill="${F.hautDunkel}"/>
  <ellipse cx="112" cy="21" rx="8" ry="4" fill="#fff" opacity=".25" transform="rotate(-20 112 21)"/>
  <path d="M120 16l6 10" stroke="#e8b48e" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>
  <path d="M96 31q8-6 20-2" stroke="${F.bartDunkel}" stroke-width="4.5" stroke-linecap="round" fill="none"/>
  <path d="M117 30q4-2 8 0" stroke="${F.bartDunkel}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
  <ellipse cx="107" cy="36" rx="2.6" ry="2" fill="#1e120c"/>
  <circle class="brom-auge" cx="106.2" cy="35.4" r=".9" style="fill:var(--akzent)"/>
  <path d="M101 33q-9 7-7 14 4 4 10 1 2-8-3-15Z" fill="${F.hautDunkel}"/>
  <ellipse cx="97" cy="45" rx="2.5" ry="1.6" fill="${F.hautTief}" opacity=".6"/>
  <path class="brom-randlicht" d="M101 19q-6 9-5 22M95 44q-2 4 3 6" filter="url(#${g('weich')})" fill="none" stroke-width="2.2" stroke-linecap="round" style="stroke:var(--akzent)"/>

  <!-- Gewaltiger, geflochtener Bart mit Goldringen -->
  <path d="M97 40q-12 30-2 58 8 22 19 38 11-16 19-38 12-30 4-58-8 15-21 16-13-1-19-16Z" fill="url(#${g('bart')})"/>
  <path d="M95 60q-6 16 0 30M137 58q4 18-2 32" stroke="${F.bartHell}" stroke-width="1.4" fill="none" opacity=".55"/>
  <path d="M100 56q4 18 10 34M108 58q2 20 6 40M118 58q-1 22-3 42M126 54q-3 20-8 38" stroke="${F.bartDunkel}" stroke-width="1.1" fill="none" opacity=".75"/>
  <path d="M104 60q2 14 6 26M122 60q-1 12-4 24" stroke="${F.bartHell}" stroke-width="1" fill="none" opacity=".6"/>
  <path d="M94 50q10-4 20 2 6-5 14-2-6 8-14 6-10 3-20-6Z" fill="${F.bartDunkel}"/>
  <rect x="108.5" y="100" width="10" height="6" rx="2" fill="${F.gold}"/>
  <rect x="109.5" y="117" width="8" height="5" rx="2" fill="${F.gold}"/>
  <path d="M109 101.5h9M110 118.5h7" stroke="#fff3c4" stroke-width=".8" opacity=".7"/>

  </g>

  <!-- Vorderer Arm: riesige Schulter, Bizeps mit Adern, Unterarm auf dem Knie -->
  <ellipse cx="104" cy="86" rx="18" ry="17" fill="url(#${g('haut')})"/>
  <path d="M86 80q8-16 30-12 8 14 2 30-16 6-32-2Z" fill="url(#${g('shirt')})"/>
  <path d="M86 94q12 6 30 0l-1 6q-14 5-29-1Z" fill="${F.shirtDunkel}"/>
  <path d="M90 96q-14 14-10 34 8 8 18 4 16-14 18-36Z" fill="url(#${g('haut')})"/>
  <ellipse cx="94" cy="112" rx="7" ry="10" fill="${F.hautHell}" opacity=".45" transform="rotate(20 94 112)"/>
  <path d="M100 104q-4 10-2 20M96 110q-6 4-6 10" stroke="${F.hautDunkel}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".8"/>
  <path d="M84 124Q66 128 54 138q-4 10 4 14 18-4 40-16Z" fill="url(#${g('haut')})"/>
  <path d="M84 128q-12 4-22 12M78 132q-6 6-12 8" stroke="${F.hautDunkel}" stroke-width="1.2" fill="none" opacity=".8"/>
  <circle cx="55" cy="144" r="10.5" fill="${F.haut}"/>
  <path d="M47 140q6 1 9 4M46 145q6 1 9 4M48 150q5 0 8 2" stroke="${F.hautTief}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
  <ellipse cx="52" cy="140" rx="4" ry="3" fill="${F.hautHell}" opacity=".6"/>

  <!-- Feuerschein auf der Feuerseite (Randlicht) -->
  <g class="brom-randlicht" filter="url(#${g('weich')})" fill="none" stroke-linecap="round" style="stroke:var(--akzent)">
    <path d="M86 84q-6 14-6 40" stroke-width="2.5"/>
    <path d="M45 140q-2 10 8 14" stroke-width="2.5"/>
    <path d="M60 158q-6 20-4 44M42 204q-2 6-2 10" stroke-width="2.5"/>
  </g>`;
}

/** Brom als eigenständiges SVG. ansicht: 'ganz' (sitzend) | 'portraet' (Kopf und Schultern). */
export function bromSvg(groesse = 96, ansicht = 'ganz') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const box = ansicht === 'portraet' ? [64, 12, 110, 110] : [0, 0, 210, 222];
  svg.setAttribute('viewBox', box.join(' '));
  svg.setAttribute('width', groesse);
  svg.setAttribute('height', Math.round((groesse * box[3]) / box[2]));
  svg.setAttribute('class', `brom brom-${ansicht}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Brom, der Schmied');
  svg.innerHTML = bromMarkup(`brom${Math.random().toString(36).slice(2, 7)}`);
  return svg;
}
