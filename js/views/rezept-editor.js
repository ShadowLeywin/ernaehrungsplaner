// Rezept anlegen und bearbeiten: Zutaten, Portionen, Zubereitung, Bewertung, Geschmack, Vorteile, Tags.
import { el, setze, zahl, schalter, textFeld } from '../ui.js';
import { icon } from '../icons.js';
import { episch } from '../darstellung.js';
import { oeffneEintragDialog } from './eintrag-dialog.js';
import { REZEPT_ARTEN, BEWERTUNGEN, rezeptGesamt, portionsGewicht } from '../logic/rezepte.js';

/** optionen: { rezept (Kopie), basis (Lebensmittel ohne Rezepte), einstellung, beiSpeichern(rezept), beiLoeschen? } */
export function oeffneRezeptEditor({ rezept, basis, einstellung, beiSpeichern, beiLoeschen }) {
  const r = structuredClone(rezept);
  const dialog = el('dialog', { class: 'dialog' });
  const schliessen = () => { dialog.close(); dialog.remove(); };
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); schliessen(); });
  document.body.append(dialog);
  const nachId = new Map(basis.map((l) => [l.id, l]));

  const zutatenBereich = el('div');
  const summe = el('p', { class: 'vorschau' });
  const aktualisiereSumme = () => {
    const g = rezeptGesamt(r, basis);
    const n = Math.max(1, r.portionen || 1);
    summe.textContent = r.zutaten.length
      ? `Pro Portion (${zahl(Math.round(portionsGewicht(r)))} g): ${zahl(Math.round((g.kcal ?? 0) / n))} kcal · P ${zahl(Math.round((g.protein ?? 0) / n))} · KH ${zahl(Math.round((g.kh ?? 0) / n))} · F ${zahl(Math.round((g.fett ?? 0) / n))}`
      : 'Noch keine Zutaten.';
  };
  const zeichneZutaten = () => {
    setze(zutatenBereich, ...r.zutaten.map((z, i) => {
      const feld = el('input', {
        type: 'number', inputMode: 'decimal', min: 0, step: 'any', value: z.gramm, 'aria-label': 'Gramm',
        oninput: () => { z.gramm = Number.isFinite(feld.valueAsNumber) ? feld.valueAsNumber : 0; aktualisiereSumme(); },
      });
      return el('div', { class: 'memo-zeile' },
        el('span', { class: 'memo-name' }, nachId.get(z.lebensmittelId)?.name ?? z.lebensmittelId),
        el('span', { class: 'memo-menge' }, feld, el('span', { class: 'leise' }, 'g'),
          el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Zutat entfernen', onclick: () => { r.zutaten.splice(i, 1); zeichneZutaten(); } }, icon('schliessen', 16))));
    }));
    aktualisiereSumme();
  };

  const notenFeld = (schluessel, text) => {
    const anzeige = el('strong', {}, r.bewertung[schluessel] ? String(r.bewertung[schluessel]) : '–');
    const regler = el('input', {
      type: 'range', min: 0, max: 10, step: 1, value: r.bewertung[schluessel] ?? 0, 'aria-label': text,
      oninput: () => { r.bewertung[schluessel] = Number(regler.value) || null; anzeige.textContent = r.bewertung[schluessel] ? String(r.bewertung[schluessel]) : '–'; },
    });
    return el('label', { class: 'feld regler' }, el('span', { class: 'zeile' }, text, anzeige), regler);
  };
  const textBereich = (text, schluessel, platzhalter, zeilen = 3) => el('label', { class: 'feld' }, el('span', {}, text),
    el('textarea', { class: 'memo-feld', rows: zeilen, value: r[schluessel] ?? '', placeholder: platzhalter, oninput: (e) => { r[schluessel] = e.target.value; } }));

  const fehler = el('p', { class: 'warnung klein', role: 'alert' });
  const speichern = () => {
    if (!r.name.trim()) { fehler.textContent = 'Bitte einen Namen eingeben.'; return; }
    if (!r.zutaten.length) { fehler.textContent = 'Bitte mindestens eine Zutat hinzufügen.'; return; }
    if (!r.geschmackText.trim() || !r.vorteile.trim()) { fehler.textContent = 'Bitte Geschmack und Vorteile kurz beschreiben.'; return; }
    r.erstelltAm ??= new Date().toISOString();
    r.zutaten = r.zutaten.filter((z) => z.gramm > 0);
    beiSpeichern(r);
    schliessen();
  };

  const portionen = el('input', {
    type: 'number', inputMode: 'numeric', min: 1, step: 1, value: r.portionen,
    oninput: (e) => { r.portionen = Math.max(1, Math.round(e.target.valueAsNumber || 1)); aktualisiereSumme(); },
  });
  const gekocht = el('input', {
    type: 'number', inputMode: 'decimal', min: 0, step: 'any', value: r.gewichtGekochtG ?? '', placeholder: 'optional',
    oninput: (e) => { r.gewichtGekochtG = e.target.value === '' ? null : e.target.valueAsNumber; aktualisiereSumme(); },
  });

  setze(dialog,
    el('div', { class: 'dialog-kopf' },
      el('h2', {}, rezept.name ? episch('Rezept umschreiben', 'Rezept bearbeiten') : episch('Neues Rezept ins Buch', 'Neues Rezept')),
      el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Schließen', onclick: schliessen }, icon('schliessen'))),
    el('div', { class: 'dialog-inhalt' },
      textFeld('Name', r.name, (w) => { r.name = w; }, 'z. B. Chili sin Carne'),
      el('label', { class: 'feld' }, el('span', {}, 'Art'),
        el('select', { onchange: (e) => { r.art = e.target.value; } },
          ...Object.entries(REZEPT_ARTEN).map(([id, a]) => el('option', { value: id, selected: id === r.art }, episch(`${a.episch} (${a.name})`, a.name))))),
      el('h3', { class: 'abschnitt' }, 'Zutaten'),
      zutatenBereich,
      el('button', {
        class: 'knopf zweitrangig voll', type: 'button',
        onclick: () => oeffneEintragDialog({
          lebensmittel: basis, einstellung, titel: 'Zutat hinzufügen',
          beiSpeichern: (lebensmittelId, gramm) => { r.zutaten.push({ lebensmittelId, gramm }); zeichneZutaten(); },
        }),
      }, icon('plus', 18), 'Zutat'),
      el('div', { class: 'felder', style: 'margin-top:12px' },
        el('label', { class: 'feld' }, el('span', {}, 'Portionen'), portionen),
        el('label', { class: 'feld' }, el('span', {}, 'Gewicht gekocht (g)'), gekocht)),
      summe,
      textBereich('Zubereitung', 'zubereitung', 'Schritte, Zeiten, Tipps …', 4),
      el('h3', { class: 'abschnitt' }, 'Bewertung'),
      notenFeld('gesamt', 'Gesamtnote'),
      ...Object.entries(BEWERTUNGEN).map(([k, t]) => notenFeld(k, t)),
      textBereich('Geschmack', 'geschmackText', 'Wie schmeckt es? z. B. würzig, rauchig, cremig …', 2),
      textBereich('Vorteile', 'vorteile', 'z. B. viel Protein, gut vorzubereiten, günstig …', 2),
      textFeld('Tags (mit Komma getrennt)', r.tags.join(', '), (w) => { r.tags = w.split(',').map((t) => t.trim()).filter(Boolean); }, 'mealprep, vegan, schnell'),
      textBereich('Notiz', 'notiz', '', 2),
      schalter(r.wiederEssen, (w) => { r.wiederEssen = w; }, 'Würde ich wieder essen'),
      fehler,
      el('div', { class: 'knopfreihe' },
        el('button', { class: 'knopf', type: 'button', onclick: speichern }, 'Speichern'),
        beiLoeschen ? el('button', { class: 'knopf zweitrangig gefahr', type: 'button', onclick: () => { beiLoeschen(); schliessen(); } }, 'Löschen') : null)));
  zeichneZutaten();
  dialog.showModal();
}
