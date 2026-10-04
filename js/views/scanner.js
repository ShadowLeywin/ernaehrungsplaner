// Lebensmittel von außen holen: Barcode scannen (Kamera, BarcodeDetector) oder eintippen, online suchen
// (Open Food Facts, z. B. nach Marke) oder selbst anlegen. Treffer werden lokal gespeichert und sind danach offline da.
import { el, setze, zahl } from '../ui.js';
import { icon } from '../icons.js';
import { istBarcode, eigenesLebensmittel } from '../logic/off.js';
import { produktPerBarcode, sucheOnline, speichereEigenesLebensmittel } from '../off-abfrage.js';

const HINWEIS = 'Dabei wird nur der Barcode bzw. Suchbegriff an Open Food Facts gesendet – keine persönlichen Daten.';

/** modus: 'barcode' | 'suche' | 'eigen'. beiAuswahl(lebensmittel) nach dem Speichern. */
export function oeffneScanner(modus, beiAuswahl) {
  const dialog = el('dialog', { class: 'dialog' });
  let stream = null;
  let laeuft = false;
  const stoppeKamera = () => { laeuft = false; stream?.getTracks().forEach((t) => t.stop()); stream = null; };
  const schliessen = () => { stoppeKamera(); dialog.close(); dialog.remove(); };
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); schliessen(); });
  document.body.append(dialog);

  const status = el('p', { class: 'leise klein', role: 'status' });
  const fehler = (text) => { status.textContent = text; status.className = 'warnung klein'; };
  const uebernehmen = async (lm) => {
    await speichereEigenesLebensmittel(lm);
    schliessen();
    beiAuswahl(lm);
  };
  const kopf = (titel) => el('div', { class: 'dialog-kopf' },
    el('h2', {}, titel),
    el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Schließen', onclick: schliessen }, icon('schliessen')));

  const trefferListe = (liste) => el('ul', { class: 'liste auswahl' }, ...liste.map((lm) => el('li', {},
    el('button', { type: 'button', class: 'auswahl-eintrag', onclick: () => uebernehmen(lm) },
      el('span', {}, lm.name, lm.marke ? el('span', { class: 'leise' }, ` · ${lm.marke}`) : null),
      el('span', { class: 'leise klein' }, `${zahl(Math.round(lm.je100g.kcal))} kcal · P ${zahl(lm.je100g.protein)} · KH ${zahl(lm.je100g.kh)} · F ${zahl(lm.je100g.fett)} je 100 g`)))));

  const sucheBarcode = async (code) => {
    status.className = 'leise klein';
    status.textContent = `Suche ${code} …`;
    try {
      const lm = await produktPerBarcode(code);
      if (lm) uebernehmen(lm);
      else fehler(`Produkt ${code} nicht gefunden. Leg es selbst an (Werte von der Packung).`);
    } catch (f) {
      fehler(navigator.onLine ? f.message : 'Offline – Barcode-Abfrage braucht Internet.');
    }
  };

  const zeigeBarcode = () => {
    const video = el('video', { class: 'scanner-video', playsInline: true, muted: true });
    const eingabe = el('input', { type: 'text', inputMode: 'numeric', placeholder: 'EAN, z. B. 4000400123456', 'aria-label': 'Barcode' });
    const pruefen = () => { const c = eingabe.value.trim(); if (istBarcode(c)) sucheBarcode(c); else fehler('Ein Barcode hat 8 bis 14 Ziffern.'); };
    eingabe.addEventListener('keydown', (e) => { if (e.key === 'Enter') pruefen(); });
    const kannScannen = 'BarcodeDetector' in window && navigator.mediaDevices?.getUserMedia;
    setze(dialog, kopf('Barcode'), el('div', { class: 'dialog-inhalt' },
      kannScannen ? video : el('p', { class: 'leise klein' }, 'Dieser Browser kann keine Barcodes per Kamera lesen. Tippe die Nummer unter dem Strichcode ein.'),
      el('div', { class: 'manuell' }, eingabe, el('button', { class: 'knopf', type: 'button', onclick: pruefen }, 'Suchen')),
      status,
      el('p', { class: 'leise klein' }, HINWEIS),
      el('div', { class: 'knopfreihe' },
        el('button', { class: 'knopf zweitrangig', type: 'button', onclick: () => { stoppeKamera(); zeigeEigen(); } }, 'Selbst anlegen'))));
    if (!kannScannen) return;
    const detektor = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then((s) => {
      stream = s;
      video.srcObject = s;
      video.play();
      laeuft = true;
      const pruefeBild = async () => {
        if (!laeuft) return;
        try {
          const codes = await detektor.detect(video);
          if (codes.length) {
            navigator.vibrate?.(80);
            stoppeKamera();
            eingabe.value = codes[0].rawValue;
            sucheBarcode(codes[0].rawValue);
            return;
          }
        } catch { /* Bild noch nicht bereit */ }
        setTimeout(pruefeBild, 250);
      };
      pruefeBild();
    }).catch(() => fehler('Kein Kamerazugriff – Nummer bitte eintippen.'));
  };

  const zeigeSuche = () => {
    const bereich = el('div');
    const eingabe = el('input', { type: 'search', placeholder: 'z. B. Ehrmann Skyr, Kölln Haferflocken', 'aria-label': 'Online suchen' });
    const suchen = async () => {
      const begriff = eingabe.value.trim();
      if (begriff.length < 3) { fehler('Bitte mindestens 3 Zeichen eingeben.'); return; }
      if (istBarcode(begriff)) { sucheBarcode(begriff); return; }
      status.className = 'leise klein';
      status.textContent = 'Suche …';
      try {
        const liste = await sucheOnline(begriff);
        status.textContent = liste.length ? `${liste.length} Treffer – Werte bitte mit der Packung vergleichen.` : 'Nichts gefunden.';
        setze(bereich, trefferListe(liste));
      } catch (f) {
        fehler(navigator.onLine ? f.message : 'Offline – die Online-Suche braucht Internet.');
      }
    };
    eingabe.addEventListener('keydown', (e) => { if (e.key === 'Enter') suchen(); });
    setze(dialog, kopf('Online suchen'), el('div', { class: 'dialog-inhalt' },
      el('div', { class: 'manuell' }, eingabe, el('button', { class: 'knopf', type: 'button', onclick: suchen }, 'Suchen')),
      status, el('p', { class: 'leise klein' }, HINWEIS), bereich));
    eingabe.focus();
  };

  const zeigeEigen = () => {
    const w = { name: '', marke: '', kcal: null, protein: null, kh: null, fett: null, zucker: null, ballaststoffe: null, salz: null, stueckG: null };
    const feld = (text, schluessel, typ = 'number') => el('label', { class: 'feld' }, el('span', {}, text),
      el('input', {
        type: typ, inputMode: typ === 'number' ? 'decimal' : undefined, step: 'any', min: 0,
        oninput: (e) => { w[schluessel] = typ === 'number' ? (Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : null) : e.target.value; },
      }));
    const speichern = () => {
      if (!w.name.trim() || w.kcal == null) { fehler('Name und kcal sind Pflicht.'); return; }
      uebernehmen(eigenesLebensmittel(Date.now().toString(36), w));
    };
    setze(dialog, kopf('Eigenes Lebensmittel'), el('div', { class: 'dialog-inhalt' },
      el('p', { class: 'leise klein' }, 'Werte je 100 g von der Packung abschreiben.'),
      feld('Name', 'name', 'text'), feld('Marke (optional)', 'marke', 'text'),
      el('div', { class: 'felder' }, feld('kcal', 'kcal'), feld('Protein (g)', 'protein'), feld('Kohlenhydrate (g)', 'kh'), feld('Fett (g)', 'fett'),
        feld('davon Zucker (g)', 'zucker'), feld('Ballaststoffe (g)', 'ballaststoffe'), feld('Salz (g)', 'salz'), feld('Portion/Stück (g)', 'stueckG')),
      status,
      el('button', { class: 'knopf voll', type: 'button', onclick: speichern }, 'Speichern')));
  };

  dialog.showModal();
  ({ barcode: zeigeBarcode, suche: zeigeSuche, eigen: zeigeEigen })[modus]();
}
