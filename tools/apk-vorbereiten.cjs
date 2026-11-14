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

/**
 * Android braucht eine ganze Zahl (versionCode), die mit jedem Update wächst.
 * Aufbau: Haupt·10^8 + Neben·10^6 + Flick·10^4 + Baunummer (0 bis 9999).
 * So bleibt der Name "1.0.0", und trotzdem nimmt Android jedes neue APK als Update an.
 */
function versionsNummer(version, bau = 0) {
  const [haupt, neben, flick] = version.split('.').map(Number);
  return haupt * 100000000 + neben * 1000000 + flick * 10000 + Math.min(Math.max(0, bau), 9999);
}

/** Baunummer: aus der Umgebung (BAUNUMMER) oder die Zahl der Git-Commits */
function baunummer() {
  if (process.env.BAUNUMMER) return Number(process.env.BAUNUMMER);
  try {
    return Number(require('node:child_process').execSync('git rev-list --count HEAD', { cwd: WURZEL }).toString().trim());
  } catch {
    return 0;
  }
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
      .replace(/versionCode \d+/, `versionCode ${versionsNummer(APP_VERSION, baunummer())}`)
      .replace(/versionName "[^"]*"/, `versionName "${APP_VERSION}"`);
    fs.writeFileSync(gradle, neu);
    console.log(`build.gradle: versionName ${APP_VERSION}, versionCode ${versionsNummer(APP_VERSION, baunummer())}`);
  }
}

module.exports = { versionsNummer, dateiliste };
if (require.main === module) main();
