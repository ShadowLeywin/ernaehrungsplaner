// Kleine Helfer zum Bauen der Oberfläche.

/** el('p', { class: 'leise' }, 'Text', kindElement) – Ereignisse mit on…: { onclick: fn } */
export function el(tag, eigenschaften = {}, ...kinder) {
  const element = document.createElement(tag);
  for (const [name, wert] of Object.entries(eigenschaften)) {
    if (wert == null || wert === false) continue;
    if (name.startsWith('on')) element.addEventListener(name.slice(2), wert);
    else if (name === 'class') element.className = wert;
    else if (name in element) element[name] = wert;
    else element.setAttribute(name, wert === true ? '' : wert);
  }
  element.append(...kinder.flat().filter((k) => k != null && k !== false));
  return element;
}

/** Wie replaceChildren, aber null/false werden übersprungen (replaceChildren würde "null" als Text einfügen). */
export function setze(element, ...kinder) {
  element.replaceChildren(...kinder.flat().filter((k) => k != null && k !== false));
}

const zahlFormat =new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
export const zahl = (wert) => zahlFormat.format(wert);

/** Zahlenfeld mit Beschriftung; ruft beiAenderung mit einer Zahl auf. */
export function zahlFeld(beschriftung, wert, einheit, beiAenderung) {
  const eingabe = el('input', {
    type: 'number',
    inputMode: 'decimal',
    min: 0,
    step: 'any',
    value: wert,
    oninput: () => beiAenderung(Number.isFinite(eingabe.valueAsNumber) ? eingabe.valueAsNumber : 0),
  });
  return el('label', { class: 'feld' },
    el('span', {}, einheit ? `${beschriftung} (${einheit})` : beschriftung),
    eingabe);
}

/** Checkbox mit Beschriftung (Kinder dürfen Elemente sein). */
export function schalter(wert, beiAenderung, ...beschriftung) {
  const eingabe = el('input', {
    type: 'checkbox',
    checked: wert,
    onchange: () => beiAenderung(eingabe.checked),
  });
  return el('label', { class: 'schalter' }, eingabe, el('span', {}, ...beschriftung));
}

export function textFeld(beschriftung, wert, beiAenderung, platzhalter = '') {
  const eingabe = el('input', {
    type: 'text',
    value: wert,
    placeholder: platzhalter,
    oninput: () => beiAenderung(eingabe.value),
  });
  return el('label', { class: 'feld' }, el('span', {}, beschriftung), eingabe);
}
