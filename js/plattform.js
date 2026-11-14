// Was im Browser und in der Android-App unterschiedlich läuft, steht hier an einer Stelle.
// In der App (Capacitor) gibt es kein Herunterladen und kein navigator.share; dafür native Plugins.
// Aufgerufen werden sie über die Brücke window.Capacitor.nativePromise, die Capacitor selbst einfügt.
// So braucht die Web-App weiterhin keinen Build-Schritt und keine Bibliothek.

const cap = () => globalThis.Capacitor;
export const istApp = () => Boolean(cap()?.isNativePlatform?.());
const nativ = (plugin, methode, optionen) => cap().nativePromise(plugin, methode, optionen);

/**
 * Farbe der Symbole in Status- und Navigationsleiste passend zum Design. Ohne diesen Aufruf richtet sich
 * Android nach dem Handy: helles Handy, dunkles Design ergäbe dunkle Symbole auf Schwarz.
 * 'DARK' heißt bei Capacitor: helle Symbole für dunklen Grund.
 */
export function setzeSystemleisten(dunkel) {
  if (!istApp()) return;
  try {
    nativ('SystemBars', 'setStyle', { style: dunkel ? 'DARK' : 'LIGHT' }).catch(() => {});
  } catch { /* ältere App ohne Plugin: Leisten bleiben wie vom System */ }
}

/* ---------- Vibration beim Tippen ---------- */

const SCHLUESSEL_VIBRATION = 'elan.vibration';

/** Vibration an oder aus; gilt je Gerät. Standard: an. */
export function vibrationAn() {
  try { return localStorage.getItem(SCHLUESSEL_VIBRATION) !== 'aus'; } catch { return true; }
}

export function setzeVibration(an) {
  try { localStorage.setItem(SCHLUESSEL_VIBRATION, an ? 'an' : 'aus'); } catch { /* gilt dann nur bis zum Neuladen */ }
}

/**
 * Kurzes Tippgefühl. art 'leicht' (Wasser, Häkchen), 'erfolg' (etwas eingetragen) oder 'feier' (Ziel erreicht).
 * App: Plugin Haptics (nutzt den Vibrationsmotor wie native Apps). Browser: navigator.vibrate, falls vorhanden.
 * Wartet nie und wirft nie: Fehlt die Vibration, geht alles andere normal weiter.
 */
export function tippGefuehl(art = 'leicht') {
  if (!vibrationAn()) return;
  try {
    if (istApp()) {
      const aufruf = {
        erfolg: () => nativ('Haptics', 'notification', { type: 'SUCCESS' }),
        feier: () => nativ('Haptics', 'impact', { style: 'HEAVY' }),
      }[art]?.() ?? nativ('Haptics', 'impact', { style: 'LIGHT' });
      aufruf.catch(() => {});
    } else {
      navigator.vibrate?.({ erfolg: [12, 60, 18], feier: [18, 50, 18, 50, 36] }[art] ?? 10);
    }
  } catch { /* ohne Vibration weiter */ }
}

/* ---------- Widget auf dem Startbildschirm (nur App) ---------- */

/**
 * Werte für das Android-Widget: { datum, kcalUebrig, wasserMl, wasserZielMl }, ganze Zahlen.
 * Im Browser gibt es kein Widget; dort passiert nichts. Fehler stören die App nicht.
 */
export function aktualisiereWidget(werte) {
  if (!istApp()) return;
  try {
    nativ('ElanWidget', 'aktualisiere', {
      datum: werte.datum,
      kcalUebrig: Math.round(werte.kcalUebrig),
      wasserMl: Math.round(werte.wasserMl),
      wasserZielMl: Math.round(werte.wasserZielMl),
    }).catch(() => {});
  } catch { /* ältere App ohne Widget */ }
}

/** Bricht der Nutzer das Teilen-Menü ab, ist das kein Fehler. */
const abgebrochen = (fehler) => fehler?.name === 'AbortError' || /cancel/i.test(String(fehler?.message ?? fehler));

/**
 * Eine Textdatei an den Nutzer geben. Browser: Download. App: Datei anlegen und das Teilen-Menü öffnen,
 * dort wählt man "In Dateien speichern", Drive oder eine Mail. Liefert 'gespeichert' oder 'abgebrochen'.
 */
export async function gibDatei(name, inhalt, typ = 'application/json') {
  if (istApp()) {
    const { uri } = await nativ('Filesystem', 'writeFile', { path: name, data: inhalt, directory: 'CACHE', encoding: 'utf8', recursive: true });
    try {
      await nativ('Share', 'share', { title: name, files: [uri], dialogTitle: 'Backup ablegen' });
      return 'gespeichert';
    } catch (fehler) {
      if (abgebrochen(fehler)) return 'abgebrochen';
      throw fehler;
    }
  }
  const url = URL.createObjectURL(new Blob([inhalt], { type: typ }));
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'gespeichert';
}

/** Text teilen; ohne Teilen-Menü in die Zwischenablage. Liefert 'geteilt', 'kopiert' oder 'abgebrochen'. */
export async function teileText(text, titel = '') {
  try {
    if (istApp()) { await nativ('Share', 'share', { title: titel, text, dialogTitle: titel || 'Teilen' }); return 'geteilt'; }
    if (navigator.share) { await navigator.share({ title: titel, text }); return 'geteilt'; }
  } catch (fehler) {
    if (abgebrochen(fehler)) return 'abgebrochen';
    throw fehler;
  }
  await navigator.clipboard.writeText(text);
  return 'kopiert';
}

/**
 * JSON von einer fremden Adresse holen. In der App über das native HTTP von Capacitor:
 * Das umgeht die Herkunftsprüfung (CORS) des WebView, die sonst je nach Server scheitern kann.
 * Liefert { status, daten }.
 */
export async function holeJson(url, millisekunden = 15000) {
  if (istApp()) {
    const antwort = await nativ('CapacitorHttp', 'request', {
      url, method: 'GET', headers: { Accept: 'application/json' }, responseType: 'json', connectTimeout: millisekunden, readTimeout: millisekunden,
    });
    return { status: antwort.status, daten: typeof antwort.data === 'string' ? JSON.parse(antwort.data) : antwort.data };
  }
  const abbruch = new AbortController();
  const timer = setTimeout(() => abbruch.abort(), millisekunden);
  try {
    const antwort = await fetch(url, { signal: abbruch.signal, credentials: 'omit', headers: { Accept: 'application/json' } });
    return { status: antwort.status, daten: antwort.ok ? await antwort.json() : null };
  } finally {
    clearTimeout(timer);
  }
}
