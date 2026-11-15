// Kleine Helfer für die Oberfläche: Elemente bauen, Zahlen formatieren, Blatt (Dialog) und Hinweis (Toast).

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Fehler einer Aktion melden, statt sie still verschwinden zu lassen. */
export function meldeFehler(fehler) {
  console.error(fehler);
  hinweis(`Das hat nicht geklappt: ${fehler?.message ?? fehler}`);
}

/**
 * Klick und Absenden absichern. Gibt der Handler ein Promise zurück (Speichern), zählen weitere
 * Tipps erst, wenn es fertig ist: Ein Doppeltipp legt so keinen Eintrag doppelt an.
 * Formulare sperren solange ihre Absende-Knöpfe. Fehler landen als Hinweis statt unbemerkt in der Konsole.
 */
function gesichert(knoten, art, handler) {
  return (ereignis) => {
    if (knoten.dataset.laeuft) {
      if (art === 'submit') ereignis.preventDefault(); // sonst lädt der Browser die Seite neu
      return;
    }
    let ergebnis;
    try { ergebnis = handler(ereignis); } catch (fehler) { meldeFehler(fehler); return; }
    if (!ergebnis || typeof ergebnis.then !== 'function') return;
    knoten.dataset.laeuft = '1';
    const knoepfe = art === 'submit' ? [...knoten.querySelectorAll('button[type=submit]:not(:disabled)')] : [];
    for (const k of knoepfe) k.disabled = true;
    ergebnis.catch(meldeFehler).finally(() => {
      delete knoten.dataset.laeuft;
      for (const k of knoepfe) k.disabled = false;
    });
  };
}

function fuelle(knoten, attribute, kinder) {
  for (const [name, wert] of Object.entries(attribute ?? {})) {
    if (wert === null || wert === undefined || wert === false) continue;
    if ((name === 'onclick' || name === 'onsubmit') && typeof wert === 'function') knoten.addEventListener(name.slice(2), gesichert(knoten, name.slice(2), wert));
    else if (name.startsWith('on') && typeof wert === 'function') knoten.addEventListener(name.slice(2), wert);
    else if (name === 'class') knoten.setAttribute('class', wert);
    else if (name === 'dataset') Object.assign(knoten.dataset, wert);
    else if (name === 'value' && !(knoten instanceof SVGElement)) knoten.value = wert;
    else knoten.setAttribute(name, wert === true ? '' : String(wert));
  }
  for (const kind of kinder.flat(Infinity)) {
    if (kind === null || kind === undefined || kind === false) continue;
    knoten.append(kind instanceof Node ? kind : document.createTextNode(String(kind)));
  }
  return knoten;
}

/** HTML-Element bauen: el('button', { class: 'knopf', onclick: fn }, 'Text') */
export const el = (tag, attribute, ...kinder) => fuelle(document.createElement(tag), attribute, kinder);

/**
 * Kinder an ein vorhandenes Element hängen und dabei null/false überspringen.
 * Das eingebaute element.append(null) würde den Text "null" in die Seite schreiben.
 */
export const haenge = (knoten, ...kinder) => fuelle(knoten, null, kinder);

/**
 * Farbiges Symbol vor einem Titel: mitBild('💧', 'wasser', 'Wasser').
 * farbe ist der Name einer Farbvariable aus css/app.css. Das Symbol ist für Screenreader ausgeblendet,
 * damit der Name des Titels gleich bleibt.
 */
export const mitBild = (symbol, farbe, ...text) => [
  el('span', { class: 'titel-bild', style: `--bild-farbe:var(--${farbe})`, 'aria-hidden': 'true' }, symbol), ...text];

/** SVG-Element bauen (braucht einen eigenen Namensraum) */
export const svg = (tag, attribute, ...kinder) => fuelle(document.createElementNS(SVG_NS, tag), attribute, kinder);

/** Zahl deutsch formatieren: 1234.5 → "1.234,5" */
export function zahl(wert, stellen = 0) {
  if (typeof wert !== 'number' || !Number.isFinite(wert)) return '–';
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: stellen, minimumFractionDigits: 0 }).format(wert);
}

/** Gramm-Angaben: unter 10 mit einer Nachkommastelle, sonst ganz */
export const gramm = (wert) => zahl(wert, Math.abs(wert) < 10 ? 1 : 0);

const PFADE = {
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  // Tüte zum Mitnehmen, für „Unterwegs“
  unterwegs: 'M6 8h12l-1 12H7L6 8zM9 8V6a3 3 0 0 1 6 0v2',
  zurueck: 'M15 5l-7 7 7 7',
  vor: 'M9 5l7 7-7 7',
  haken: 'M5 12.5l4.5 4.5L19 7.5',
  zu: 'M6 6l12 12M18 6L6 18',
  suche: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  // Tagesscheibe: Kreis mit drei Schnitten
  heute: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9',
  // Blatt
  zutaten: 'M5 19c0-8 5-14 14-14 0 9-6 14-14 14zM5 19l8-8',
  // Regler
  mehr: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
};

export function icon(name, groesse = 24) {
  return svg('svg', {
    viewBox: '0 0 24 24', width: groesse, height: groesse, fill: 'none', stroke: 'currentColor',
    'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true',
  }, svg('path', { d: PFADE[name] }));
}

/* ---------- Hinweis (Toast) ---------- */

let hinweisTimer;

/** Kurze Rückmeldung am unteren Rand, optional mit einer Aktion (z. B. "Rückgängig"). */
export function hinweis(text, { aktion, beiAktion } = {}) {
  const ort = document.getElementById('hinweis');
  clearTimeout(hinweisTimer);
  const schliessen = () => ort.replaceChildren();
  ort.replaceChildren(el('div', { class: 'hinweis' },
    el('span', {}, text),
    aktion ? el('button', { type: 'button', class: 'hinweis-aktion', onclick: () => { schliessen(); beiAktion(); } }, aktion) : null));
  hinweisTimer = setTimeout(schliessen, aktion ? 7000 : 3500);
}

/* ---------- Blatt (Dialog von unten) ---------- */

/**
 * Öffnet ein Blatt über der Seite. inhalt ist ein Element oder eine Funktion (blatt) => Element.
 * Die Zurück-Taste von Android und Escape schließen es (macht der Browser bei <dialog> selbst).
 */
export function blatt({ titel, inhalt, beiSchliessen }) {
  const koerper = el('div', { class: 'blatt-koerper' });
  const titelEl = el('h2', { class: 'blatt-titel' }, titel);
  const dialog = el('dialog', { class: 'blatt' },
    el('div', { class: 'blatt-kopf' },
      titelEl,
      el('button', { type: 'button', class: 'rund', 'aria-label': 'Schließen', onclick: () => zu() }, icon('zu'))),
    koerper);
  // Schließen mit kurzer Abwärtsbewegung. Ohne Animation (reduzierte Bewegung) oder falls das Ende
  // der Animation nie gemeldet wird, schließt ein Zeitlimit trotzdem: Das Blatt bleibt nie hängen.
  const zu = () => {
    if (!dialog.open || dialog.classList.contains('schliesst')) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { dialog.close(); return; }
    dialog.classList.add('schliesst');
    dialog.inert = true; // während der Animation nichts mehr antippen (sonst zweites Speichern möglich)
    const fertig = () => { clearTimeout(zeit); if (dialog.open) dialog.close(); };
    const zeit = setTimeout(fertig, 260);
    // Nur das Ende der eigenen Animation zählt, nicht das eines Kindes (Ring, Hinweis …)
    dialog.addEventListener('animationend', (e) => { if (e.target === dialog) fertig(); });
  };
  const steuerung = {
    schliessen: zu,
    setze: (neuerTitel, neuerInhalt) => { titelEl.textContent = neuerTitel; koerper.replaceChildren(neuerInhalt); },
  };
  koerper.append(typeof inhalt === 'function' ? inhalt(steuerung) : inhalt);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) zu(); }); // Tippen neben das Blatt
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); zu(); }); // Zurück-Taste oder Escape
  dialog.addEventListener('close', () => { dialog.remove(); beiSchliessen?.(); });
  // Ein Blatt, das gerade hinausgleitet, sofort schließen: nie zwei Blätter mit gleichen Feldern gleichzeitig
  for (const alt of document.querySelectorAll('dialog.blatt.schliesst')) alt.close();
  document.body.append(dialog);
  dialog.showModal();
  return steuerung;
}

/** Rückfrage vor etwas, das sich nicht zurücknehmen lässt. Liefert true oder false. */
export function bestaetige({ titel, text, ja, nein = 'Abbrechen', gefaehrlich = false }) {
  return new Promise((aufloesen) => {
    let antwort = false;
    const b = blatt({
      titel,
      inhalt: el('div', { class: 'stapel' },
        el('p', {}, text),
        el('div', { class: 'knopfreihe' },
          el('button', { type: 'button', class: 'knopf leise', onclick: () => b.schliessen() }, nein),
          el('button', { type: 'button', class: gefaehrlich ? 'knopf warnung' : 'knopf', onclick: () => { antwort = true; b.schliessen(); } }, ja))),
      beiSchliessen: () => aufloesen(antwort),
    });
  });
}

/** Beschriftetes Eingabefeld mit Platz für eine Fehlermeldung */
/* ---------- Einstellungen im Stil von iOS: Gruppen aus Zeilen ---------- */

/**
 * Gruppe: kleiner Titel über der Karte, Zeilen darin, Erklärung klein darunter.
 * So stehen Einstellungen ruhig untereinander statt als Formular mit Kästen.
 */
export function gruppe({ titel, fuss, klasse = '' } = {}, ...zeilen) {
  return el('section', { class: `egruppe ${klasse}`.trim(), 'aria-label': titel ?? null },
    titel ? el('h2', { class: 'egruppe-titel' }, titel) : null,
    el('div', { class: 'eliste' }, zeilen),
    fuss ? el('div', { class: 'egruppe-fuss' }, fuss) : null);
}

/** Zeile mit Eingabe rechts („Energie … 2.700 kcal“). Gleiche id und Fehlermeldung wie feld(). */
export function zeileFeld({ name, beschriftung, einheit, fehler, ...attribute }) {
  const id = `f-${name}`;
  return el('div', { class: fehler ? 'ezeile hat-fehler' : 'ezeile' },
    el('label', { for: id, class: 'ezeile-text' }, beschriftung),
    el('span', { class: 'ezeile-wert' },
      el('input', { id, name, autocomplete: 'off', 'aria-invalid': fehler ? 'true' : null, 'aria-describedby': fehler ? `${id}-fehler` : null, ...attribute }),
      einheit ? el('span', { class: 'einheit' }, einheit) : null),
    fehler ? el('p', { class: 'fehlertext', id: `${id}-fehler` }, fehler) : null);
}

/** Zeile mit Auswahl rechts. Das native Auswahlmenü bleibt (Barrierefreiheit, Handy-Bedienung), nur schlicht gezeichnet. */
export function zeileWahl({ id, beschriftung, optionen, wert, leer, onchange }) {
  return el('div', { class: 'ezeile' },
    el('label', { for: id, class: 'ezeile-text' }, beschriftung),
    el('span', { class: 'ezeile-wert wahlfeld' },
      el('select', { id, onchange },
        leer ? el('option', { value: '' }, leer) : null,
        optionen.map((o) => el('option', { value: o.id, selected: o.id === wert }, o.name))),
      icon('vor', 16)));
}

/** Zeile mit Schalter für An/Aus. Ein Kontrollkästchen mit role="switch": Screenreader sagen „Schalter, an“. */
export function zeileSchalter({ id, beschriftung, text, an, onchange }) {
  return el('label', { class: 'ezeile schalter-zeile', for: id },
    el('span', { class: 'ezeile-text' }, beschriftung, text ? el('small', {}, text) : null),
    el('input', { type: 'checkbox', role: 'switch', class: 'schalter', id, checked: an ? true : null, onchange }));
}

/** Auswahl aus wenigen Möglichkeiten als Liste mit Häkchen (wie bei iOS), technisch Radioknöpfe. */
export function zeilenAuswahl({ name, optionen, wert, onchange }) {
  return optionen.map((o) => el('label', { class: 'ezeile auswahl' },
    el('input', { type: 'radio', class: 'unsichtbar', name, value: o.id, checked: o.id === wert ? true : null, onchange: () => onchange(o.id) }),
    o.vorschau ?? null,
    el('span', { class: 'ezeile-text' }, o.name, o.text ? el('small', {}, o.text) : null),
    el('span', { class: 'auswahl-haken', 'aria-hidden': 'true' }, icon('haken', 20))));
}

export function feld({ name, beschriftung, einheit, fehler, ...attribute }) {
  const id = `f-${name}`;
  return el('div', { class: fehler ? 'feld hat-fehler' : 'feld' },
    el('label', { for: id }, beschriftung),
    el('div', { class: 'eingabe' },
      el('input', { id, name, autocomplete: 'off', 'aria-invalid': fehler ? 'true' : null, 'aria-describedby': fehler ? `${id}-fehler` : null, ...attribute }),
      einheit ? el('span', { class: 'einheit' }, einheit) : null),
    fehler ? el('p', { class: 'fehlertext', id: `${id}-fehler` }, fehler) : null);
}
