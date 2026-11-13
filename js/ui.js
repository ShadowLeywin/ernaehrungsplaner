// Kleine Helfer für die Oberfläche: Elemente bauen, Zahlen formatieren, Blatt (Dialog) und Hinweis (Toast).

const SVG_NS = 'http://www.w3.org/2000/svg';

function fuelle(knoten, attribute, kinder) {
  for (const [name, wert] of Object.entries(attribute ?? {})) {
    if (wert === null || wert === undefined || wert === false) continue;
    if (name.startsWith('on') && typeof wert === 'function') knoten.addEventListener(name.slice(2), wert);
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
  zurueck: 'M15 5l-7 7 7 7',
  vor: 'M9 5l7 7-7 7',
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
      el('button', { type: 'button', class: 'rund', 'aria-label': 'Schließen', onclick: () => dialog.close() }, icon('zu'))),
    koerper);
  const steuerung = {
    schliessen: () => dialog.close(),
    setze: (neuerTitel, neuerInhalt) => { titelEl.textContent = neuerTitel; koerper.replaceChildren(neuerInhalt); },
  };
  koerper.append(typeof inhalt === 'function' ? inhalt(steuerung) : inhalt);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); }); // Tippen neben das Blatt
  dialog.addEventListener('close', () => { dialog.remove(); beiSchliessen?.(); });
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
export function feld({ name, beschriftung, einheit, fehler, ...attribute }) {
  const id = `f-${name}`;
  return el('div', { class: fehler ? 'feld hat-fehler' : 'feld' },
    el('label', { for: id }, beschriftung),
    el('div', { class: 'eingabe' },
      el('input', { id, name, autocomplete: 'off', 'aria-invalid': fehler ? 'true' : null, 'aria-describedby': fehler ? `${id}-fehler` : null, ...attribute }),
      einheit ? el('span', { class: 'einheit' }, einheit) : null),
    fehler ? el('p', { class: 'fehlertext', id: `${id}-fehler` }, fehler) : null);
}
