// Meal-Prep: Gesamtgewicht nach dem Kochen ÷ Portionen (Standard 7) → Portionsgewicht und Nährwerte pro Portion.
// Mit Rezept (#/mealprep/<id>) oder frei mit eigener Kalorienangabe.
import { el, setze, zahl } from '../ui.js';
import { icon } from '../icons.js';
import { episch } from '../darstellung.js';
import { holeLebensmittel } from '../lebensmittel.js';
import { rezeptGesamt, mealPrep, rohGewicht, STANDARD_PORTIONEN_MEALPREP } from '../logic/rezepte.js';
import { holeRezepte, speichereRezepte } from './rezepte.js';

export const mealprep = {
  titel: 'Meal-Prep',
  reiter: 'mehr',
  render() {
    const wurzel = el('div', {}, el('p', { class: 'leise' }, 'Lade …'));
    lade(wurzel);
    return wurzel;
  },
};

async function lade(wurzel) {
  const [liste, daten] = await Promise.all([holeRezepte(), holeLebensmittel()]);
  let rezeptId = decodeURIComponent(location.hash.split('/')[2] ?? '') || null;
  const zustand = { gewicht: null, portionen: STANDARD_PORTIONEN_MEALPREP, kcalFrei: null, proteinFrei: null };

  const ergebnis = el('div');
  const rezept = () => liste.find((r) => r.id === rezeptId) ?? null;
  const rechne = () => {
    const r = rezept();
    const gesamt = r ? rezeptGesamt(r, daten.basis) : { kcal: zustand.kcalFrei ?? 0, protein: zustand.proteinFrei ?? 0 };
    if (!(zustand.gewicht > 0)) { setze(ergebnis, el('p', { class: 'leise klein' }, 'Gib das Gesamtgewicht nach dem Kochen ein (Topf vorher tarieren).')); return; }
    const m = mealPrep({ gesamtGewichtG: zustand.gewicht, portionen: zustand.portionen, gesamtNaehrwerte: gesamt });
    setze(ergebnis,
      el('section', { class: 'karte hero' },
        el('h2', {}, episch('Rationen für die Woche', 'Ergebnis')),
        el('p', { class: 'grosszahl' }, `${zahl(Math.round(m.portionsGewichtG))} g`),
        el('p', { class: 'leise klein' }, `pro Portion bei ${zustand.portionen} Portionen`),
        el('div', { class: 'statistik' },
          el('div', { class: 'stat' }, el('strong', {}, zahl(Math.round(m.proPortion.kcal ?? 0))), el('span', {}, 'kcal')),
          el('div', { class: 'stat' }, el('strong', {}, `${zahl(Math.round(m.proPortion.protein ?? 0))} g`), el('span', {}, 'Protein')),
          r ? el('div', { class: 'stat' }, el('strong', {}, `${zahl(Math.round(m.proPortion.kh ?? 0))}/${zahl(Math.round(m.proPortion.fett ?? 0))}`), el('span', {}, 'KH/Fett g')) : null),
        r ? el('button', {
          class: 'knopf voll', type: 'button',
          onclick: async (e) => {
            Object.assign(r, { gewichtGekochtG: zustand.gewicht, portionen: zustand.portionen });
            await speichereRezepte(liste);
            e.target.textContent = '✓ Im Rezept gespeichert – Portionen jetzt eintragbar';
          },
        }, 'Gewicht & Portionen im Rezept speichern') : null));
  };

  const zahlEingabe = (text, wert, setzen, platzhalter = '') => el('label', { class: 'feld' }, el('span', {}, text),
    el('input', { type: 'number', inputMode: 'decimal', min: 0, step: 'any', value: wert ?? '', placeholder: platzhalter, oninput: (e) => { setzen(Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : null); rechne(); } }));

  const zeichne = () => {
    const r = rezept();
    setze(wurzel,
      el('section', { class: 'karte' },
        el('label', { class: 'feld' }, el('span', {}, 'Rezept'),
          el('select', { onchange: (e) => { rezeptId = e.target.value || null; zeichne(); } },
            el('option', { value: '' }, 'Ohne Rezept (frei rechnen)'),
            ...liste.map((x) => el('option', { value: x.id, selected: x.id === rezeptId }, x.name)))),
        r ? el('p', { class: 'leise klein' }, `Zutaten roh: ${zahl(rohGewicht(r))} g`) : null,
        el('div', { class: 'felder' },
          zahlEingabe('Gesamtgewicht gekocht (g)', zustand.gewicht, (w) => { zustand.gewicht = w; }, 'z. B. 3600'),
          zahlEingabe('Portionen', zustand.portionen, (w) => { zustand.portionen = Math.max(1, Math.round(w || 1)); })),
        r ? null : el('div', { class: 'felder' },
          zahlEingabe('kcal gesamt', zustand.kcalFrei, (w) => { zustand.kcalFrei = w; }, 'optional'),
          zahlEingabe('Protein gesamt (g)', zustand.proteinFrei, (w) => { zustand.proteinFrei = w; }, 'optional'))),
      ergebnis,
      liste.length ? null : el('p', { class: 'leise klein' }, el('a', { href: '#/rezepte' }, 'Rezept anlegen →'), ' – dann rechnet Meal-Prep alle Nährwerte aus den Zutaten.'),
      el('p', { class: 'leise klein' }, icon('mealprep', 14), ' Beispiel: Chili mit 3,6 kg fertig ÷ 7 = rund 514 g pro Portion.'));
    rechne();
  };
  zeichne();
}
