// Barcode-Scanner (Léons Wunsch vom 23.11.2026): Strichcode scannen, bekannte Zutat finden oder bei Open Food Facts nachschlagen.
// Netz nur nach dem Scan, den der Nutzer selbst ausgelöst hat; gesendet wird nur die Nummer. Bilder speichert Elan nie.

import { normalisiereBarcode, pruefzifferStimmt, zutatZumBarcode } from '../logik/barcode.js';
import { sucheOnline } from '../off-abruf.js';
import { istApp, kannScannen, scanneBarcode } from '../plattform.js';
import { gehe } from '../router.js';
import * as speicher from '../speicher.js';
import { blatt, el, hinweis } from '../ui.js';

/** Im Browser: Kamerabild in einem Blatt, bis ein Code erkannt oder abgebrochen wird */
function scanneImBlatt() {
  return new Promise((fertig, fehler) => {
    const abbruch = new AbortController();
    const video = el('video', { class: 'scanner-bild', playsinline: true, muted: true, 'aria-label': 'Kamerabild' });
    const b = blatt({
      titel: 'Strichcode scannen',
      inhalt: el('div', { class: 'stapel' }, video, el('p', { class: 'klein' }, 'Halte den Strichcode ruhig ins Bild. Elan speichert kein Bild.')),
      beiSchliessen: () => abbruch.abort(),
    });
    scanneBarcode({ video, signal: abbruch.signal })
      .then((r) => { b.schliessen(); fertig(r); })
      .catch((f) => { b.schliessen(); fehler(f); });
  });
}

/**
 * Ganzer Ablauf. Liefert die Zutat (gespeichert, falls neu von Open Food Facts) oder null.
 * Meldungen erklären jeden Abbruchgrund in einem Satz.
 */
export async function scanneZutat() {
  if (!kannScannen()) {
    hinweis('Den Scanner gibt es in der Android-App. Hier: Ziffern unter dem Strichcode ins Suchfeld tippen.');
    return null;
  }
  let ergebnis;
  try {
    ergebnis = await (istApp() ? scanneBarcode() : scanneImBlatt());
  } catch (fehler) {
    hinweis(/permission|denied|erlaubt/i.test(String(fehler?.message)) ? 'Ohne Kamera geht der Scanner nicht. Du kannst sie in den Android-Einstellungen für Elan erlauben.' : `Scannen hat nicht geklappt: ${fehler?.message ?? fehler}`);
    return null;
  }
  if (ergebnis.abgebrochen) return null;
  const code = normalisiereBarcode(ergebnis.code);
  if (!code || !pruefzifferStimmt(code)) { hinweis('Der Strichcode wurde nicht sauber erkannt. Versuch es noch einmal, mit etwas Abstand.'); return null; }

  const bekannt = zutatZumBarcode(await speicher.alleZutaten(), code);
  if (bekannt) return bekannt;

  hinweis(`Suche ${code} bei Open Food Facts …`);
  let treffer;
  try {
    treffer = await sucheOnline(code);
  } catch (fehler) {
    hinweis(fehler.message);
    return null;
  }
  if (!treffer.length) {
    blatt({
      titel: 'Produkt unbekannt',
      inhalt: (b) => el('div', { class: 'stapel' },
        el('p', {}, `Open Food Facts kennt den Strichcode ${code} noch nicht, oder es fehlen Nährwerte.`),
        el('p', { class: 'klein' }, 'Leg die Zutat mit den Werten von der Packung selbst an. Elan schätzt keine Nährwerte.'),
        el('button', { type: 'button', class: 'knopf', onclick: () => { b.schliessen(); gehe('/zutaten/neu'); } }, 'Eigene Zutat anlegen')),
    });
    return null;
  }
  // Die gescannte Nummer merken: Open Food Facts führt manche Produkte unter einer anderen Schreibweise
  // (z. B. UPC mit oder ohne führende Null); so findet der nächste Scan die Zutat ohne neuen Abruf
  const zutat = { ...treffer[0], barcode: code };
  await speicher.speichereZutat(zutat);
  hinweis(`„${zutat.name}“ von Open Food Facts übernommen.`);
  return zutat;
}
