// Dialog: Lebensmittel suchen und Menge festlegen – zum Hinzufügen und Bearbeiten von Einträgen.
import { el, zahl } from '../ui.js';
import { sucheLebensmittel } from '../lebensmittel.js';
import { naehrwerteFuerMenge, KATEGORIEN } from '../logic/naehrstoffe.js';

/**
 * optionen: { lebensmittel, titel, eintrag?, beiSpeichern(lebensmittelId, gramm), beiLoeschen? }
 * Mit `eintrag` startet der Dialog direkt bei der Mengenauswahl.
 */
export function oeffneEintragDialog(optionen) {
  const dialog = el('dialog', { class: 'dialog' });
  const schliessen = () => { dialog.close(); dialog.remove(); };
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); schliessen(); });
  document.body.append(dialog);

  const kopf = (titel, zurueck) => el('div', { class: 'dialog-kopf' },
    zurueck
      ? el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Zurück', onclick: zurueck }, '‹')
      : null,
    el('h2', {}, titel),
    el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Schließen', onclick: schliessen }, '✕'));

  const zeigeAuswahl = () => {
    const liste = el('ul', { class: 'liste auswahl' });
    const suche = el('input', {
      type: 'search',
      placeholder: 'Lebensmittel suchen …',
      'aria-label': 'Lebensmittel suchen',
      oninput: () => zeigeTreffer(),
    });
    const zeigeTreffer = () => {
      const treffer = sucheLebensmittel(optionen.lebensmittel, suche.value).slice(0, 60);
      liste.replaceChildren(...treffer.map((lm) => el('li', {},
        el('button', { type: 'button', class: 'auswahl-eintrag', onclick: () => zeigeMenge(lm, lm.stueckG ?? 100) },
          el('span', {}, lm.name),
          el('span', { class: 'leise klein' }, `${KATEGORIEN[lm.kategorie]} · ${zahl(lm.je100g.kcal)} kcal/100 g`)))));
    };
    dialog.replaceChildren(kopf(optionen.titel), el('div', { class: 'dialog-inhalt' }, suche, liste));
    zeigeTreffer();
    suche.focus();
  };

  const zeigeMenge = (lm, startGramm) => {
    const vorschau = el('p', { class: 'vorschau' });
    const menge = el('input', {
      type: 'number',
      inputMode: 'decimal',
      min: 1,
      step: 'any',
      value: startGramm,
      'aria-label': 'Menge in Gramm',
      oninput: () => aktualisiere(),
    });
    const gramm = () => (Number.isFinite(menge.valueAsNumber) ? menge.valueAsNumber : 0);
    const speichern = el('button', { class: 'knopf', type: 'button' }, optionen.eintrag ? 'Speichern' : 'Hinzufügen');
    const aktualisiere = () => {
      const w = naehrwerteFuerMenge(lm.je100g, gramm());
      vorschau.textContent = `${zahl(Math.round(w.kcal))} kcal · P ${zahl(w.protein)} g · KH ${zahl(w.kh)} g · F ${zahl(w.fett)} g`;
      speichern.disabled = gramm() <= 0;
    };
    speichern.addEventListener('click', () => {
      if (gramm() <= 0) return;
      optionen.beiSpeichern(lm.id, gramm());
      schliessen();
    });
    menge.addEventListener('keydown', (e) => { if (e.key === 'Enter') speichern.click(); });

    const schnell = [
      ...(lm.stueckG ? [[`1 Stück (${lm.stueckG} g)`, lm.stueckG], [`2 Stück`, lm.stueckG * 2]] : []),
      ...[50, 100, 150, 200, 250].map((g) => [`${g} g`, g]),
    ];

    dialog.replaceChildren(
      kopf(lm.name, optionen.eintrag ? null : zeigeAuswahl),
      el('div', { class: 'dialog-inhalt' },
        el('label', { class: 'feld' }, el('span', {}, 'Menge (g)'), menge),
        el('div', { class: 'chips' }, ...schnell.map(([text, g]) => el('button', {
          class: 'chip',
          type: 'button',
          onclick: () => { menge.value = g; aktualisiere(); },
        }, text))),
        vorschau,
        el('div', { class: 'knopfreihe' },
          speichern,
          optionen.eintrag && optionen.beiLoeschen
            ? el('button', {
              class: 'knopf zweitrangig gefahr',
              type: 'button',
              onclick: () => { optionen.beiLoeschen(); schliessen(); },
            }, 'Löschen')
            : null)),
    );
    aktualisiere();
    menge.select();
  };

  dialog.showModal();
  if (optionen.eintrag) {
    const lm = optionen.lebensmittel.find((l) => l.id === optionen.eintrag.lebensmittelId);
    if (lm) zeigeMenge(lm, optionen.eintrag.gramm);
    else zeigeAuswahl();
  } else {
    zeigeAuswahl();
  }
}
