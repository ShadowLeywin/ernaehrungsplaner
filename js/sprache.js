// Spracheingabe über die Web Speech API des Browsers.
// Achtung Datenschutz: Chrome schickt die Aufnahme zur Erkennung an Google. Deshalb nur nach
// ausdrücklichem Einschalten (pro Gerät) – sonst bleibt der Mikrofon-Knopf verborgen.

const SCHLUESSEL = 'spracheErlaubt';

export const spracheVerfuegbar = () => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

export function spracheErlaubt() {
  try { return localStorage.getItem(SCHLUESSEL) === 'ja'; } catch { return false; }
}

export function setzeSpracheErlaubt(wert) {
  try { localStorage.setItem(SCHLUESSEL, wert ? 'ja' : 'nein'); } catch { /* nur für diese Sitzung */ }
}

/** Startet ein Diktat. beiText(text, fertig) wird laufend aufgerufen. Liefert eine Stopp-Funktion. */
export function diktiere(beiText, beiEnde, beiFehler) {
  const Erkennung = window.SpeechRecognition || window.webkitSpeechRecognition;
  const erkennung = new Erkennung();
  erkennung.lang = 'de-DE';
  erkennung.interimResults = true;
  erkennung.continuous = true;
  erkennung.onresult = (e) => {
    const text = Array.from(e.results).map((r) => r[0].transcript).join(' ');
    beiText(text, e.results[e.results.length - 1].isFinal);
  };
  erkennung.onerror = (e) => beiFehler?.(e.error === 'not-allowed' ? 'Mikrofon nicht erlaubt.' : e.error === 'network' ? 'Spracherkennung braucht Internet.' : `Fehler: ${e.error}`);
  erkennung.onend = () => beiEnde?.();
  erkennung.start();
  return () => erkennung.stop();
}
