// Brom im Manhwa-Stil: Tusche-Konturen, harte Zellschattierung, glühende Augen, flammende Kraft-Aura.
// Massiger Zwergenschmied, sitzt auf einem Baumstamm am Lagerfeuer (Feuer links von ihm), T-Shirt, Jeans,
// Arbeitsstiefel, geflochtener Bart mit Goldringen, Hammer am Stamm. Raster 210 × 222, Aura im Farbthema.

const K = '#120a06'; // Tusche
const F = {
  haut: '#c98556', hautSchatten: '#8a4f2b', hautTief: '#5e3219', hautLicht: '#f2b27c',
  haar: '#8e2f12', haarSchatten: '#521707', haarLicht: '#d65a28', haarGlanz: '#ff9a5a',
  shirt: '#262a31', shirtSchatten: '#13151a', shirtLicht: '#454b58',
  jeans: '#2b4166', jeansSchatten: '#18263f', jeansLicht: '#4d6c9c',
  stiefel: '#3b2414', stiefelSchatten: '#1f1109', holz: '#5b3720', holzSchatten: '#36200f', holzLicht: '#8d5d37',
  gold: '#c9a24a', goldLicht: '#ffe7a3', metall: '#59616d', metallLicht: '#a3acb8', rand: '#ffd296', narbe: '#e7a487',
};

const linie = (d, breite = 2) => `<path d="${d}" fill="none" stroke="${K}" stroke-width="${breite}" stroke-linecap="round" stroke-linejoin="round"/>`;
const form = (d, farbe, breite = 2) => `<path d="${d}" fill="${farbe}" stroke="${K}" stroke-width="${breite}" stroke-linejoin="round"/>`;
const flaeche = (d, farbe, deckkraft = 1) => `<path d="${d}" fill="${farbe}"${deckkraft < 1 ? ` opacity="${deckkraft}"` : ''}/>`;

/** SVG-Markup von Brom. id macht Filter eindeutig, wenn Brom mehrfach auf der Seite ist. */
export function bromMarkup(id = 'b') {
  const g = (name) => `${id}-${name}`;
  const glut = Array.from({ length: 12 }, (_, i) => {
    const x = 50 + ((i * 53) % 150);
    return `<circle class="brom-glut" cx="${x}" cy="${160 - (i % 5) * 22}" r="${0.9 + (i % 3) * 0.6}" style="animation-delay:${(i * 0.41).toFixed(2)}s"/>`;
  }).join('');
  // Flammenzungen der Aura entlang von Kopf und Schultern
  const zungen = [
    'M78 70Q66 46 74 22Q80 40 92 50Z', 'M96 30Q90 8 102 -6Q104 14 114 20Z', 'M126 16Q130 -4 146 -10Q138 10 140 24Z',
    'M156 40Q168 18 186 14Q172 32 170 50Z', 'M178 84Q196 66 208 70Q192 84 186 100Z', 'M60 120Q42 104 40 82Q52 98 70 104Z',
  ].map((d, i) => `<path class="brom-flamme" d="${d}" style="fill:var(${i % 2 ? '--akzent-2' : '--akzent'});animation-delay:${(i * 0.27).toFixed(2)}s"/>`).join('');

  return `
  <defs>
    <filter id="${g('aura')}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>
    <filter id="${g('weich')}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.2"/></filter>
    <filter id="${g('leuchten')}" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>

  <!-- KRAFT-AURA: flammende Silhouette, Zungen, Energielinien, Glut -->
  <g class="brom-aura" filter="url(#${g('aura')})">
    <path d="M56 216Q36 172 50 132Q40 104 60 84Q54 56 78 40Q76 14 100 4Q110-8 124 2Q142-6 150 14Q172 18 176 42Q198 54 192 82Q210 104 198 130Q212 160 198 190L202 216Z" style="fill:var(--akzent)" opacity=".6"/>
    ${zungen}
  </g>
  <g class="brom-aura" filter="url(#${g('aura')})" style="animation-delay:-1.2s">
    <path d="M74 210Q62 176 72 144Q66 116 82 100Q80 76 96 62Q96 40 112 30Q128 24 138 36Q156 40 160 60Q176 70 172 94Q184 114 178 138Q186 166 178 192L180 210Z" fill="#ffd9a0" opacity=".28"/>
  </g>
  <path class="brom-aura-kern" d="M70 214Q54 176 66 140Q58 110 76 94Q72 68 92 54Q92 30 112 22Q130 16 140 30Q160 34 164 56Q182 66 178 92Q192 112 184 136Q194 164 184 192L186 214Z" fill="none" style="stroke:var(--akzent)" stroke-width="2.5" opacity=".7" filter="url(#${g('weich')})"/>
  <g class="brom-energie" style="stroke:var(--akzent)" stroke-width="1.2" stroke-linecap="round" opacity=".55">
    <path d="M44 150v-26M50 110V92M196 150v-30M204 112V96M64 70V54M176 40V26M120-2v-8"/>
  </g>
  <g>${glut}</g>

  <!-- Baumstamm -->
  ${form('M60 166H184A11 14 0 0 1 184 194H60A11 14 0 0 1 60 166Z', F.holz)}
  ${flaeche('M52 182H194A11 14 0 0 1 184 194H60A11 14 0 0 1 52 182Z', F.holzSchatten)}
  ${flaeche('M62 168H150Q120 172 66 174Z', F.holzLicht, 0.8)}
  ${linie('M74 176l14 2M104 172l18 3M132 186l20-1M90 188l10-2', 1.2)}
  ${form('M184 166A11 14 0 0 1 184 194A11 14 0 0 1 184 166Z', '#a8744a', 1.8)}
  ${linie('M184 172a5 8 0 0 1 0 16a5 8 0 0 1 0-16M184 177a2 3 0 0 1 0 6', 1)}

  <!-- Schmiedehammer, an den Stamm gelehnt -->
  <path d="M191 204 177 116" stroke="${K}" stroke-width="8" stroke-linecap="round"/>
  <path d="M191 204 177 116" stroke="#6e4527" stroke-width="5" stroke-linecap="round"/>
  ${linie('M178 132l5-1M179 138l5-1M180 144l5-1M181 150l5-1', 1.4)}
  <g transform="rotate(-8 191 204)">
    ${form('M174 194h34v18h-34Z', F.metall)}
    ${flaeche('M174 194h34v5h-34Z', F.metallLicht)}
    ${flaeche('M174 207h34v5h-34Z', '#3a4049')}
  </g>

  <!-- Hinteres Bein -->
  ${form('M150 164Q118 150 92 142Q78 146 80 160Q112 174 148 182Z', F.jeansSchatten)}
  ${form('M84 150Q76 176 78 202H98Q98 176 100 152Z', F.jeansSchatten)}
  ${form('M70 198H100Q110 198 110 208V214H64Q62 198 70 198Z', F.stiefelSchatten)}

  <!-- Vorderes Bein: Jeans mit harten Falten, Arbeitsstiefel -->
  ${form('M148 166Q110 156 76 150Q58 152 58 168Q94 186 146 194Z', F.jeans)}
  ${flaeche('M60 170Q94 186 146 194L146 186Q100 178 66 164Z', F.jeansSchatten)}
  ${flaeche('M78 152Q110 156 142 166L140 170Q108 162 76 157Z', F.jeansLicht, 0.7)}
  ${flaeche('M62 156Q70 150 80 154L74 166Q66 166 62 160Z', F.jeansLicht, 0.6)}
  ${linie('M100 170l10 6-12 0M124 176l8 6', 1.3)}
  ${form('M60 160Q52 184 54 206H82Q80 184 84 164Z', F.jeans)}
  ${flaeche('M74 164Q72 186 74 206H82Q80 184 84 164Z', F.jeansSchatten)}
  ${linie('M58 182l10 2-6 4M56 196l12 1', 1.2)}
  ${form('M46 200H84Q94 200 94 211V218H38Q37 200 46 200Z', F.stiefel)}
  ${flaeche('M38 213H94V218H38Z', F.stiefelSchatten)}
  ${flaeche('M46 201H62Q52 204 44 210Z', '#6b4428', 0.8)}
  ${linie('M60 202l4 6M66 202l4 6M72 202l4 6', 1.1)}

  <!-- Rumpf: enges T-Shirt, harte Schatten, Falten -->
  ${form('M100 76Q122 56 156 58Q182 66 180 100Q178 138 162 170H112Q98 142 94 112Q92 90 100 76Z', F.shirt, 2.2)}
  ${flaeche('M150 62Q182 66 180 100Q178 138 162 170H142Q160 132 157 98Q155 76 150 62Z', F.shirtSchatten)}
  ${flaeche('M97 108Q118 124 142 114Q138 124 120 130Q104 128 97 118Z', F.shirtSchatten)}
  ${flaeche('M100 80Q112 70 128 66Q114 78 104 92Z', F.shirtLicht)}
  ${flaeche('M102 96Q116 104 132 100Q118 108 104 104Z', F.shirtLicht, 0.6)}
  ${flaeche('M118 140l16-5-12 11Z', F.shirtSchatten)}
  ${flaeche('M138 150l18-6-10 12Z', F.shirtSchatten)}
  ${flaeche('M110 150l12 2-10 6Z', F.shirtSchatten)}
  ${linie('M104 76Q118 83 136 80Q152 76 160 66', 2.6)}
  <path d="M150 116c-3.4 0-5-2.3-4.3-4.7.6-2 2.3-2.9 2.7-4.9.8 1.3 1.2 2 1.4 2.7.1-2 1-4 2.1-5.1.3 2.6 2.6 4.1 3 6.8.5 2.8-1.1 5.2-4.9 5.2Z" style="fill:var(--akzent)" filter="url(#${g('leuchten')})"/>

  <!-- Gürtel -->
  ${form('M108 158Q136 166 164 158L166 170Q136 178 106 170Z', '#2a170c', 1.8)}
  ${form('M128 162h11v10h-11Z', F.gold, 1.5)}
  ${flaeche('M129 163h9v2h-9Z', F.goldLicht)}

  <!-- Hinterer Unterarm -->
  ${form('M128 118Q96 126 62 132L64 150Q98 146 130 136Z', F.hautSchatten)}
  ${linie('M110 128q-10 4-20 5', 1)}

  <!-- Nacken und Trapez -->
  ${form('M104 76Q108 54 128 50Q150 50 162 64Q148 76 130 80Q114 80 104 76Z', F.haut)}
  ${flaeche('M140 52Q156 54 162 64Q150 74 136 78Q146 66 140 52Z', F.hautSchatten)}

  <!-- KOPF: kantiges Gesicht, Narbe, glühende Augen, zurückgekämmte Stachelhaare -->
  ${form('M96 20Q112 10 128 18Q140 26 138 44Q136 56 128 62L100 62Q92 56 92 50L84 47Q82 44 88 38L92 34Q90 26 96 20Z', F.haut, 2.2)}
  ${flaeche('M118 22Q134 24 136 42Q134 56 126 62L114 62Q124 46 118 22Z', F.hautSchatten)}
  ${flaeche('M92 33Q101 30 110 33L109 38Q100 39 92 37Z', F.hautTief)}
  ${flaeche('M95 22Q104 16 114 18Q104 22 98 30Z', F.hautLicht)}
  ${flaeche('M86 40L90 37 91 45 86 46Z', F.hautLicht)}
  ${form('M128 35Q135 35 135 43Q133 50 127 48Z', F.hautSchatten, 1.6)}
  ${linie('M130 39q2 3 0 6', 1)}
  ${form('M87 31L100 26 112 28 110 32 99 30 89 34Z', F.haarSchatten, 1.4)}
  ${linie('M104 23l5-2M96 24l3 2', 1)}
  ${form('M94 35Q100 33 107 35Q101 37.5 94 35Z', '#fff4e0', 1.2)}
  <circle class="brom-auge" cx="100.5" cy="35.2" r="1.6" style="fill:var(--akzent)" filter="url(#${g('leuchten')})"/>
  <circle cx="100.5" cy="35.2" r=".6" fill="${K}"/>
  ${linie('M95 38q5 1.5 10 0', 0.9)}
  <path d="M103 22 109 44" stroke="${K}" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M103 22 109 44" stroke="${F.narbe}" stroke-width="1.3" stroke-linecap="round"/>
  ${linie('M104 27l3-1M106 33l3-1M107 39l3-1', 0.8)}
  ${linie('M91 35L84 46 90 48', 1.6)}
  ${flaeche('M86 46Q88 44 90 47Z', F.hautTief)}
  ${flaeche('M112 28Q128 24 136 36Q134 42 129 44Q124 34 112 31Z', F.haarSchatten, 0.45)}
  ${form('M120 8L150 -4 142 10 162 6 150 18 164 22 146 24Z', F.haarSchatten, 1.8)}
  ${form('M98 12L104 -2 112 8 122 -4 124 8Z', F.haar, 1.8)}
  ${form('M91 23Q98 6 118 6Q134 1 148 9L139 12Q152 16 154 27L141 22Q147 30 145 39L135 29Q124 19 108 21Q98 19 91 23Z', F.haar, 2)}
  ${flaeche('M139 12Q152 16 154 27L141 22Q147 30 145 39L135 29Q132 22 128 18Q136 15 139 12Z', F.haarSchatten)}
  ${flaeche('M98 15Q112 8 132 9Q114 12 102 19Z', F.haarLicht)}
  ${flaeche('M104 12Q116 8 126 9Q116 11 108 14Z', F.haarGlanz, 0.9)}
  ${linie('M108 21Q120 16 134 22M114 14Q128 12 140 16', 1)}

  <!-- BART: kantig, geflochten, Goldringe -->
  ${form('M92 48Q86 70 94 92Q102 116 112 138Q118 120 126 100Q138 74 136 48Q128 60 112 62Q98 60 92 48Z', F.haar, 2.2)}
  ${flaeche('M118 62Q128 58 136 48Q138 74 126 100Q120 116 112 138Q116 110 120 88Q122 72 118 62Z', F.haarSchatten)}
  ${flaeche('M95 58L102 86 98 64Z', F.haarLicht)}
  ${flaeche('M103 66L110 98 106 68Z', F.haarLicht)}
  ${flaeche('M97 62L99 72 98 64Z', F.haarGlanz)}
  ${linie('M100 76l4 14M110 70l2 22M118 70l-2 26M126 66l-4 22M106 104l4 18', 0.9)}
  ${form('M83 48Q94 43 104 50Q112 45 121 50Q112 57 102 54Q92 57 83 48Z', F.haarSchatten, 1.6)}
  ${flaeche('M86 48Q94 45 100 49Q94 48 88 50Z', F.haarLicht)}
  ${form('M103 101h11v8h-11Z', F.gold, 1.4)}
  ${flaeche('M104 102h9v2h-9Z', F.goldLicht)}
  ${form('M105 118h9v7h-9Z', F.gold, 1.4)}
  ${flaeche('M106 119h7v2h-7Z', F.goldLicht)}

  <!-- VORDERER ARM: Schulter, Bizeps mit Adern, Unterarm auf dem Knie, Faust -->
  ${form('M84 86Q88 68 106 68Q122 72 120 92Q116 104 100 104Q86 100 84 86Z', F.haut)}
  ${form('M82 82Q88 64 108 64Q124 68 122 86L120 94Q104 98 84 92Z', F.shirt)}
  ${flaeche('M110 66Q124 68 122 86L120 94Q112 96 104 96Q118 84 110 66Z', F.shirtSchatten)}
  ${flaeche('M86 74Q94 66 104 66Q94 72 88 82Z', F.shirtLicht)}
  ${linie('M84 92Q102 98 120 93', 2.6)}
  ${form('M86 96Q74 108 76 128Q82 138 96 136Q110 124 116 100Z', F.haut)}
  ${flaeche('M96 136Q110 124 116 100L109 102Q104 122 91 133Z', F.hautSchatten)}
  ${flaeche('M80 106Q82 120 89 127Q85 113 87 103Z', F.hautLicht)}
  ${linie('M95 108q-3 8-1 16M90 116q-4 3-4 8', 1)}
  ${form('M80 122Q64 126 52 136Q46 146 54 154Q76 150 100 138Q96 126 80 122Z', F.haut)}
  ${flaeche('M54 154Q76 150 100 138L97 132Q76 144 57 148Z', F.hautSchatten)}
  ${flaeche('M62 130Q72 124 82 124Q70 128 60 136Z', F.hautLicht)}
  ${linie('M84 128q-10 3-18 10M76 133q-5 4-8 9', 1)}
  ${form('M42 140Q44 130 56 132Q67 134 66 146Q64 156 54 158Q44 156 42 140Z', F.haut)}
  ${flaeche('M58 133Q67 136 66 146Q64 156 54 158Q60 148 58 133Z', F.hautSchatten)}
  ${linie('M45 139q6 0 9 3M44 145q6 0 9 3M46 151q5 0 8 2', 1.1)}
  ${flaeche('M45 134Q50 131 54 133Q48 135 46 140Z', F.hautLicht)}

  <!-- Feuerschein: harte Randlichter auf der Feuerseite -->
  <g class="brom-randlicht" filter="url(#${g('weich')})" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M92 26Q88 30 90 34M86 40Q82 44 85 47M90 52Q86 72 94 92" stroke="${F.rand}" stroke-width="1.8"/>
    <path d="M82 86Q78 100 77 118M44 136Q40 146 45 154M59 160Q53 182 55 204M40 204Q37 210 38 216" stroke="${F.rand}" stroke-width="1.8"/>
    <path d="M92 26Q88 30 90 34M82 86Q78 100 77 118M44 136Q40 146 45 154M59 160Q53 182 55 204" style="stroke:var(--akzent)" stroke-width="3.5" opacity=".45"/>
  </g>`;
}

/** Brom als eigenständiges SVG. ansicht: 'ganz' (sitzend) | 'portraet' (Kopf und Schultern). */
export function bromSvg(groesse = 96, ansicht = 'ganz') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const box = ansicht === 'portraet' ? [66, -6, 96, 96] : [0, -12, 214, 234];
  svg.setAttribute('viewBox', box.join(' '));
  svg.setAttribute('width', groesse);
  svg.setAttribute('height', Math.round((groesse * box[3]) / box[2]));
  svg.setAttribute('class', `brom brom-${ansicht}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Brom, der Schmied');
  if (ansicht === 'ganz') svg.style.overflow = 'visible';
  svg.innerHTML = bromMarkup(`brom${Math.random().toString(36).slice(2, 7)}`);
  return svg;
}
