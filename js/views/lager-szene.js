// Bild-Szene des Lagers: KI-Hintergrund je Level-Stufe, darüber flackerndes Feuerlicht, aufsteigende Funken
// (Canvas), Brom freigestellt und eine Vignette. Fehlen die Bilder, bleibt die SVG-Szene stehen.
// Das Feuer (Licht + Funken) wird mit der Serie stärker, der Ort mit dem Level prächtiger.
import { findeBild } from '../bilder.js';
import { bromSvg } from './brom-figur.js';

// Wo im Hintergrundbild das Feuer sitzt (Anteil von Breite/Höhe) – passend zu den Prompts
const FEUER_X = 0.42;
const FEUER_Y = 0.72;

// Plätze der Bauwerke in der Szene (links/unten/Breite in % der Szene), hinten zuerst
const PLAETZE = {
  wachturm: [2, 34, 14], chronikhaus: [70, 36, 16], trophaeenhalle: [16, 38, 18], statue: [58, 30, 9],
  banner: [30, 40, 7], esse: [2, 12, 18], vorratskammer: [72, 18, 14], kraeutergarten: [20, 8, 14],
  brunnen: [60, 10, 12], klimmzugbalken: [8, 30, 14], steinbank: [24, 2, 14], amboss: [52, 2, 12],
};

/** Bauwerke als Bild-Ebenen (nur die, für die es ein Bild gibt – höchste vorhandene Stufe ≤ gebaute). */
async function bautenEbenen(bauten) {
  const ebenen = [];
  for (const [id, platz] of Object.entries(PLAETZE)) {
    const stufe = bauten?.[id] ?? 0;
    for (let st = stufe; st >= 1; st -= 1) {
      const url = await findeBild(`bauten/${id}-${st}`);
      if (!url) continue;
      const img = document.createElement('img');
      img.className = 'szene-bau';
      img.src = url;
      img.alt = '';
      img.style.left = `${platz[0]}%`;
      img.style.bottom = `${platz[1]}%`;
      img.style.width = `${platz[2]}%`;
      ebenen.push(img);
      break;
    }
  }
  return ebenen;
}

/** Höchstes vorhandenes Szenenbild ≤ nr (so kannst du Bilder nach und nach ergänzen). */
async function besteSzene(nr) {
  for (let i = nr; i >= 1; i -= 1) {
    const url = await findeBild(`lager/szene-${i}`);
    if (url) return url;
  }
  return null;
}

/**
 * Ersetzt die SVG-Szene in `buehne` durch die Bild-Szene, falls Bilder vorhanden sind.
 * optionen: { szeneNr, feuerIndex (0–5), mitBrom, bauten }
 */
export async function zeigeBildSzene(buehne, { szeneNr, feuerIndex, mitBrom, bauten }) {
  const hintergrund = await besteSzene(szeneNr);
  if (!hintergrund || !buehne.isConnected) return false;
  const bromBild = mitBrom ? await findeBild('brom/sitzend') : null;

  const szene = document.createElement('div');
  szene.className = 'bild-szene';
  szene.dataset.feuer = String(feuerIndex);
  szene.style.setProperty('--feuer-x', `${FEUER_X * 100}%`);
  szene.style.setProperty('--feuer-y', `${FEUER_Y * 100}%`);

  const hg = document.createElement('img');
  hg.className = 'szene-hg';
  hg.src = hintergrund;
  hg.alt = '';
  const licht = document.createElement('div');
  licht.className = 'szene-licht';
  const funken = document.createElement('canvas');
  funken.className = 'szene-funken';
  const vignette = document.createElement('div');
  vignette.className = 'szene-vignette';
  szene.append(hg, ...(await bautenEbenen(bauten)), licht, funken);

  if (mitBrom) {
    if (bromBild) {
      const brom = document.createElement('img');
      brom.className = 'szene-brom';
      brom.src = bromBild;
      brom.alt = 'Brom, der Schmied';
      const aura = document.createElement('div');
      aura.className = 'szene-brom-aura';
      szene.append(aura, brom);
    } else {
      const brom = bromSvg(160);
      brom.classList.add('szene-brom', 'szene-brom-svg');
      szene.append(brom);
    }
  }
  szene.append(vignette);
  buehne.replaceChildren(szene);
  starteFunken(funken, feuerIndex);
  return true;
}

/** Funken steigen aus dem Feuer auf; Anzahl und Höhe wachsen mit der Feuerstufe. */
function starteFunken(canvas, feuerIndex) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = canvas.getContext('2d');
  const teilchen = [];
  const anzahl = [4, 10, 18, 28, 40, 60][feuerIndex] ?? 20;
  let breite = 0;
  let hoehe = 0;
  const groesse = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    breite = r.width;
    hoehe = r.height;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const neu = () => ({
    x: breite * FEUER_X + (Math.random() - 0.5) * breite * 0.06,
    y: hoehe * FEUER_Y,
    vx: (Math.random() - 0.5) * 0.35,
    vy: -(0.5 + Math.random() * (0.6 + feuerIndex * 0.25)),
    leben: 0,
    max: 70 + Math.random() * 90,
    r: 0.6 + Math.random() * 1.8,
  });
  groesse();
  let letzte = 0;
  const schritt = (zeit) => {
    if (!canvas.isConnected) return;
    if (document.hidden || zeit - letzte < 30) { requestAnimationFrame(schritt); return; }
    letzte = zeit;
    if (canvas.clientWidth !== Math.round(breite)) groesse();
    ctx.clearRect(0, 0, breite, hoehe);
    while (teilchen.length < anzahl) teilchen.push(neu());
    for (let i = teilchen.length - 1; i >= 0; i -= 1) {
      const t = teilchen[i];
      t.leben += 1;
      t.x += t.vx + Math.sin((t.leben + i * 7) / 12) * 0.25;
      t.y += t.vy;
      const anteil = t.leben / t.max;
      if (anteil >= 1) { teilchen.splice(i, 1); continue; }
      const alpha = anteil < 0.15 ? anteil / 0.15 : 1 - anteil;
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, ${170 + Math.round(60 * (1 - anteil))}, 90, ${alpha.toFixed(2)})`;
      ctx.shadowColor = 'rgba(255, 140, 40, 0.9)';
      ctx.shadowBlur = 6;
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(schritt);
  };
  requestAnimationFrame(schritt);
}
