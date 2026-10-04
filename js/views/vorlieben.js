// Obst- und Gemüse-Vorlieben: Noten 0–10 (0 = nie), Import/Export als wochenpraeferenzen.json.
import { el, setze } from '../ui.js';
import { icon } from '../icons.js';
import { lese, schreibe } from '../db.js';
import { holeLebensmittel } from '../lebensmittel.js';
import { pruefePraeferenzen, exportierePraeferenzen } from '../logic/wochenplan.js';

export const vorlieben = {
  titel: 'Vorlieben',
  reiter: 'woche',
  render() {
    const wurzel = el('div', {}, el('p', { class: 'leise' }, 'Lade …'));
    lade(wurzel);
    return wurzel;
  },
};

async function lade(wurzel) {
  const [daten, gespeichert] = await Promise.all([holeLebensmittel(), lese('einstellungen', 'praeferenzen')]);
  const bewertungen = gespeichert ?? {};
  const speichern = () => schreibe('einstellungen', 'praeferenzen', bewertungen);
  const status = el('p', { class: 'klein', role: 'status' });
  const kandidaten = daten.basis.filter((l) => l.kategorie === 'obst' || l.kategorie === 'gemuese');

  const zeile = (lm) => {
    const wert = el('strong', { class: 'vorliebe-wert' }, bewertungen[lm.id] == null ? '–' : String(bewertungen[lm.id]));
    const regler = el('input', {
      type: 'range', min: 0, max: 10, step: 1, value: bewertungen[lm.id] ?? 5, 'aria-label': `Note ${lm.name}`,
      oninput: () => { bewertungen[lm.id] = Number(regler.value); wert.textContent = regler.value; },
      onchange: () => speichern(),
    });
    return el('div', { class: 'vorliebe regler' }, el('span', {}, lm.name), regler, wert);
  };

  const exportieren = () => {
    const blob = new Blob([JSON.stringify(exportierePraeferenzen(bewertungen), null, 2)], { type: 'application/json' });
    const a = el('a', { href: URL.createObjectURL(blob), download: 'wochenpraeferenzen.json' });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const datei = el('input', {
    type: 'file', accept: '.json,application/json',
    onchange: async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const r = pruefePraeferenzen(await f.text(), new Set(kandidaten.map((l) => l.id)));
      if (r.fehler) { status.textContent = r.fehler; status.className = 'warnung klein'; return; }
      Object.assign(bewertungen, r.bewertungen);
      await speichern();
      lade(wurzel);
    },
  });

  setze(wurzel,
    el('a', { class: 'knopf-text zurueck-link', href: '#/woche' }, icon('zurueck', 18), 'Wochenplan'),
    el('p', { class: 'leise klein' }, 'Wie gern isst du das? 0 = nie, 10 = am liebsten. Ohne Note gilt 5. Die Noten steuern die Vorschläge im Wochenplan.'),
    ...['obst', 'gemuese'].map((kat) => el('section', { class: 'karte' },
      el('h2', {}, kat === 'obst' ? 'Obst' : 'Gemüse'),
      ...kandidaten.filter((l) => l.kategorie === kat).map(zeile))),
    el('section', { class: 'karte' },
      el('h2', {}, 'Austausch'),
      el('div', { class: 'knopfreihe' }, el('button', { class: 'knopf zweitrangig', type: 'button', onclick: exportieren }, 'Als Datei sichern')),
      el('label', { class: 'feld', style: 'margin-top:8px' }, el('span', {}, 'wochenpraeferenzen.json laden'), datei),
      status));
}
