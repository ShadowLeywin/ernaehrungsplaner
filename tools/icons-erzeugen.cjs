// Erzeugt alle Icons aus der Geometrie der Tagesscheibe: node tools/icons-erzeugen.cjs
// Web-App: icons/icon.svg und drei PNGs. Android-App (falls android/ vorhanden): Launcher-Icons und Startbilder.
// Braucht Playwright (in der Claude-Cloud-Session vorhanden).
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const WURZEL = path.resolve(__dirname, '..');
const ZIEL = path.join(WURZEL, 'icons');
const RES = path.join(WURZEL, 'android/app/src/main/res');
const GRUEN = '#1c7445';
const PAPIER = '#f5f9ec';

/** form: 'eckig' (gerundetes Quadrat), 'rund' (Kreis), 'randlos' (Fläche bis zum Rand), 'frei' (ohne Fläche) */
async function svgText(form) {
  const { segmente, sektorPfad } = await import('../js/logik/scheibe.js');
  const { SLOTS } = await import('../js/logik/ziele.js');
  // Maskierbare und adaptive Icons werden vom System beschnitten: Motiv kleiner halten
  const aussen = form === 'eckig' || form === 'rund' ? 178 : 150;
  const innen = aussen * 0.3;
  const teile = segmente(SLOTS, {}, 1, 7).map((s) => `<path d="${sektorPfad(256, 256, innen, aussen, s.start, s.ende)}"/>`).join('');
  const flaeche = {
    eckig: `<rect width="512" height="512" rx="112" fill="${GRUEN}"/>`,
    rund: `<circle cx="256" cy="256" r="256" fill="${GRUEN}"/>`,
    randlos: `<rect width="512" height="512" fill="${GRUEN}"/>`,
    frei: '',
  }[form];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${flaeche}`
    + `<g fill="#b5e13a" stroke="#b5e13a" stroke-width="12" stroke-linejoin="round">${teile}</g>`
    + `<circle cx="256" cy="256" r="${innen * 0.42}" fill="#f2c100"/></svg>\n`;
}

async function zeichne(seite, inhalt, breite, hoehe, datei, hintergrund = 'transparent') {
  await seite.setViewportSize({ width: breite, height: hoehe });
  await seite.setContent(`<style>html,body{margin:0;background:${hintergrund};width:${breite}px;height:${hoehe}px;display:grid;place-items:center}</style>${inhalt}`);
  fs.mkdirSync(path.dirname(datei), { recursive: true });
  await seite.screenshot({ path: datei, omitBackground: hintergrund === 'transparent' });
}

const groesse = (svg, px) => svg.replace('<svg ', `<svg width="${px}" height="${px}" `);

(async () => {
  fs.mkdirSync(ZIEL, { recursive: true });
  const eckig = await svgText('eckig');
  const randlos = await svgText('randlos');
  fs.writeFileSync(path.join(ZIEL, 'icon.svg'), eckig);

  const browser = await chromium.launch();
  const seite = await browser.newPage();
  for (const [name, svg, px] of [['icon-192.png', eckig, 192], ['icon-512.png', eckig, 512], ['icon-maskable-512.png', randlos, 512]]) {
    await zeichne(seite, groesse(svg, px), px, px, path.join(ZIEL, name));
  }
  console.log('Web-App: 4 Icons');

  if (fs.existsSync(RES)) {
    const rund = await svgText('rund');
    const frei = await svgText('frei');
    const dichten = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
    for (const [dichte, faktor] of Object.entries(dichten)) {
      const ordner = path.join(RES, `mipmap-${dichte}`);
      await zeichne(seite, groesse(eckig, 48 * faktor), 48 * faktor, 48 * faktor, path.join(ordner, 'ic_launcher.png'));
      await zeichne(seite, groesse(rund, 48 * faktor), 48 * faktor, 48 * faktor, path.join(ordner, 'ic_launcher_round.png'));
      // Adaptives Icon: Vordergrund 108 dp, das System legt die grüne Fläche dahinter und schneidet zu
      await zeichne(seite, groesse(frei, 108 * faktor), 108 * faktor, 108 * faktor, path.join(ordner, 'ic_launcher_foreground.png'));
    }
    // Startbilder: helle Fläche, Icon in der Mitte; Größen wie von Capacitor angelegt
    const startbilder = fs.readdirSync(RES).filter((o) => o.startsWith('drawable')).map((o) => path.join(RES, o, 'splash.png')).filter((f) => fs.existsSync(f));
    for (const datei of startbilder) {
      const { breite, hoehe } = await seite.evaluate(async (daten) => {
        const bild = new Image();
        bild.src = daten;
        await bild.decode();
        return { breite: bild.naturalWidth, hoehe: bild.naturalHeight };
      }, `data:image/png;base64,${fs.readFileSync(datei).toString('base64')}`);
      await zeichne(seite, groesse(eckig, Math.round(Math.min(breite, hoehe) * 0.32)), breite, hoehe, datei, PAPIER);
    }
    console.log(`Android: 15 Launcher-Icons, ${startbilder.length} Startbilder`);
  }
  await browser.close();
})();
