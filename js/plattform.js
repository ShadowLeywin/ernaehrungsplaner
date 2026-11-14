// Was im Browser und in der Android-App unterschiedlich läuft, steht hier an einer Stelle.
// In der App (Capacitor) gibt es kein Herunterladen und kein navigator.share; dafür native Plugins.
// Aufgerufen werden sie über die Brücke window.Capacitor.nativePromise, die Capacitor selbst einfügt.
// So braucht die Web-App weiterhin keinen Build-Schritt und keine Bibliothek.

const cap = () => globalThis.Capacitor;
export const istApp = () => Boolean(cap()?.isNativePlatform?.());
const nativ = (plugin, methode, optionen) => cap().nativePromise(plugin, methode, optionen);

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
