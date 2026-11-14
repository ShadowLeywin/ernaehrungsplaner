// Bereitet den Bau der Android-App vor: node tools/apk-vorbereiten.cjs
// 1. Kopiert genau die Dateien der App-Hülle (Liste DATEIEN in sw.js) nach www/.
//    So steckt im APK dasselbe wie im Offline-Cache der Web-App, nicht mehr und nicht weniger.
// 2. Überträgt Versionsname und Versionsnummer aus js/logik/schema.js in android/app/build.gradle.
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.resolve(__dirname, '..');
const WWW = path.join(WURZEL, 'www');

function dateiliste() {
  const sw = fs.readFileSync(path.join(WURZEL, 'sw.js'), 'utf8');
  return [...sw.matchAll(/^\s*'\.\/([^']*)',$/gm)].map((m) => m[1]).filter(Boolean);
}

/** "0.11.0" → 1100: Android braucht eine ganze Zahl, die mit jeder Version wächst. */
function versionsNummer(version) {
  const [haupt, neben, flick] = version.split('.').map(Number);
  return haupt * 1000000 + neben * 1000 + flick;
}

async function main() {
  fs.rmSync(WWW, { recursive: true, force: true });
  const liste = ['index.html', 'sw.js', ...dateiliste()];
  for (const datei of new Set(liste)) {
    const ziel = path.join(WWW, datei);
    fs.mkdirSync(path.dirname(ziel), { recursive: true });
    fs.copyFileSync(path.join(WURZEL, datei), ziel);
  }
  console.log(`www/: ${new Set(liste).size} Dateien kopiert`);

  const { APP_VERSION } = await import(path.join(WURZEL, 'js/logik/schema.js'));
  const gradle = path.join(WURZEL, 'android/app/build.gradle');
  if (fs.existsSync(gradle)) {
    const alt = fs.readFileSync(gradle, 'utf8');
    const neu = alt
      .replace(/versionCode \d+/, `versionCode ${versionsNummer(APP_VERSION)}`)
      .replace(/versionName "[^"]*"/, `versionName "${APP_VERSION}"`);
    fs.writeFileSync(gradle, neu);
    console.log(`build.gradle: versionName ${APP_VERSION}, versionCode ${versionsNummer(APP_VERSION)}`);
  }
}

module.exports = { versionsNummer, dateiliste };
if (require.main === module) main();
