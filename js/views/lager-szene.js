// Bild-Szene des Lagers: KI-Hintergrund je Level-Stufe, darüber flackerndes Feuerlicht, aufsteigende Funken
// (Canvas), Brom freigestellt und eine Vignette. Fehlen die Bilder, bleibt die SVG-Szene stehen.
// Das Feuer (Licht + Funken) wird mit der Serie stärker, der Ort mit dem Level prächtiger.
import { findeBild, bauBild } from '../bilder.js';
import { bromSvg } from './brom-figur.js';

// Wo im Hintergrundbild das Feuer sitzt (Anteil von Breite/Höhe, Mitte der Flammen) – je Szene vermessen
const FEUER = {
  1: [0.385, 0.66], 2: [0.42, 0.72], 3: [0.42, 0.66], 4: [0.381, 0.66], 5: [0.42, 0.72], 6: [0.42, 0.72],
};
// Szenen mit eingemaltem Brom (szene-<nr>-brom): eigene Feuer-Positionen
const FEUER_MIT_BROM = {
  1: [0.373, 0.63], 2: [0.42, 0.708], 3: [0.427, 0.617], 4: [0.382, 0.662], 6: [0.396, 0.63],
};
const STANDARD_FEUER = [0.42, 0.72];

// Plätze der Bauwerke in der Szene (links/unten/Breite in % der Szene), hinten zuerst
const PLAETZE = {
  wachturm: [2, 34, 14], chronikhaus: [70, 36, 16], trophaeenhalle: [16, 38, 18], statue: [58, 30, 9],
  banner: [30, 40, 7], esse: [2, 12, 18], vorratskammer: [72, 18, 14], kraeutergarten: [20, 8, 14],
  brunnen: [60, 10, 12], klimmzugbalken: [8, 30, 14], steinbank: [24, 2, 14], amboss: [52, 2, 12],
};

/** Bauwerke als Bild-Ebenen (nur die, für die es ein Bild gibt – höchste vorhandene Stufe ≤ gebaute). */
async function bautenEbenen(bauten, fleischlos) {
  const ebenen = [];
  for (const [id, platz] of Object.entries(PLAETZE)) {
    const stufe = bauten?.[id] ?? 0;
    const url = await bauBild(id, stufe, fleischlos);
    if (url) {
      const img = document.createElement('img');
      img.className = 'szene-bau';
      img.src = url;
      img.alt = '';
      img.style.left = `${platz[0]}%`;
      img.style.bottom = `${platz[1]}%`;
      img.style.width = `${platz[2]}%`;
      ebenen.push(img);
    }
  }
  return ebenen;
}

/** Höchstes vorhandenes Szenenbild ≤ nr (so kannst du Bilder nach und nach ergänzen). */
async function besteSzene(nr) {
  for (let i = nr; i >= 1; i -= 1) {
    const url = await findeBild(`lager/szene-${i}`);
    if (url) return { url, nr: i };
  }
  return null;
}

/**
 * Ersetzt die SVG-Szene in `buehne` durch die Bild-Szene, falls Bilder vorhanden sind.
 * optionen: { szeneNr, feuerIndex (0–5), mitBrom, bauten }
 */
export async function zeigeBildSzene(buehne, { szeneNr, feuerIndex, mitBrom: mitBromWunsch, bauten, fleischlos = false }) {
  let mitBrom = mitBromWunsch;
  const gefunden = await besteSzene(szeneNr);
  if (!gefunden || !buehne.isConnected) return false;
  // Gibt es diese Szene mit eingemaltem Brom? Dann diese nehmen und keine Figur darüberlegen.
  const mitBromBild = mitBrom ? await findeBild(`lager/szene-${gefunden.nr}-brom`) : null;
  if (mitBromBild) {
    gefunden.url = mitBromBild;
    gefunden.mitBrom = true;
    mitBrom = false;
  }
  // Brom: sitzend (Wunschbild), sonst stehend (freigestellt aus dem Charakterblatt), sonst Zeichnung
  let bromBild = null;
  let bromHaltung = null;
  if (mitBrom) {
    for (const haltung of ['sitzend', 'stehend']) {
      bromBild = await findeBild(`brom/${haltung}`);
      if (bromBild) { bromHaltung = haltung; break; }
    }
  }
  const [feuerX, feuerY] = (gefunden.mitBrom ? FEUER_MIT_BROM : FEUER)[gefunden.nr] ?? STANDARD_FEUER;

  const szene = document.createElement('div');
  szene.className = 'bild-szene';
  szene.dataset.feuer = String(feuerIndex);
  szene.dataset.szene = String(gefunden.nr);
  szene.style.setProperty('--feuer-x', `${feuerX * 100}%`);
  szene.style.setProperty('--feuer-y', `${feuerY * 100}%`);

  const hg = document.createElement('img');
  hg.className = 'szene-hg';
  hg.src = gefunden.url;
  hg.alt = '';
  const licht = document.createElement('div');
  licht.className = 'szene-licht';
  const funken = document.createElement('canvas');
  funken.className = 'szene-funken';
  const vignette = document.createElement('div');
  vignette.className = 'szene-vignette';
  szene.append(hg, ...(await bautenEbenen(bauten, fleischlos)), licht, funken);

  if (mitBrom) {
    if (bromBild) {
      const brom = document.createElement('img');
      brom.className = `szene-brom brom-${bromHaltung}`;
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
  starteFunken(funken, feuerIndex, feuerX, feuerY);
  return true;
}

/** Funken steigen aus dem Feuer auf; Anzahl und Höhe wachsen mit der Feuerstufe. */
function starteFunken(canvas, feuerIndex, feuerX, feuerY) {
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
    x: breite * feuerX + (Math.random() - 0.5) * breite * 0.05,
    y: hoehe * (feuerY + 0.04),
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
