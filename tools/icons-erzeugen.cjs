// Erzeugt die App-Icons aus der Geometrie der Tagesscheibe: node tools/icons-erzeugen.cjs
// Braucht Playwright (in der Claude-Cloud-Session vorhanden). Ergebnis: icons/icon.svg und drei PNGs.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ZIEL = path.resolve(__dirname, '..', 'icons');

async function svgText(randlos) {
  const { segmente, sektorPfad } = await import('../js/logik/scheibe.js');
  const { SLOTS } = await import('../js/logik/ziele.js');
  // Maskierbare Icons werden vom System rund oder eckig beschnitten: Motiv kleiner, Fläche bis zum Rand
  const aussen = randlos ? 150 : 178;
  const innen = aussen * 0.3;
  const teile = segmente(SLOTS, {}, 1, 7)
    .map((s) => `<path d="${sektorPfad(256, 256, innen, aussen, s.start, s.ende)}"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">`
    + `<rect width="512" height="512" rx="${randlos ? 0 : 112}" fill="#1c7445"/>`
    + `<g fill="#b5e13a" stroke="#b5e13a" stroke-width="12" stroke-linejoin="round">${teile}</g>`
    + `<circle cx="256" cy="256" r="${innen * 0.42}" fill="#f2c100"/></svg>\n`;
}

(async () => {
  fs.mkdirSync(ZIEL, { recursive: true });
  const normal = await svgText(false);
  const randlos = await svgText(true);
  fs.writeFileSync(path.join(ZIEL, 'icon.svg'), normal);

  const browser = await chromium.launch();
  const seite = await browser.newPage();
  for (const [name, svg, groesse] of [['icon-192.png', normal, 192], ['icon-512.png', normal, 512], ['icon-maskable-512.png', randlos, 512]]) {
    await seite.setViewportSize({ width: groesse, height: groesse });
    await seite.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${groesse}px;height:${groesse}px}</style>${svg}`);
    await seite.screenshot({ path: path.join(ZIEL, name), omitBackground: true });
    console.log('geschrieben:', name);
  }
  await browser.close();
})();
