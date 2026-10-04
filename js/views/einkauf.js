// Einkaufsliste: automatisch aus dem Wochenplan (Rezepte in Zutaten aufgelöst), nach Kategorien,
// zum Abhaken, mit eigenen Posten und Angebotshinweisen.
import { el, setze } from '../ui.js';
import { icon } from '../icons.js';
import { episch } from '../darstellung.js';
import { lese, schreibe } from '../db.js';
import { holeLebensmittel } from '../lebensmittel.js';
import { datumSchluessel } from '../logic/ziele.js';
import { KATEGORIEN } from '../logic/naehrstoffe.js';
import { einkaufsliste, einkaufsMenge } from '../logic/wochenplan.js';
import { angeboteJeLebensmittel, preisText } from '../logic/angebote.js';
import { holeAktuelleAngebote } from '../angebote-speicher.js';
import { holePlan, aktuellerMontag } from './woche.js';
import { holeRezepte } from './rezepte.js';

export const einkauf = {
  get titel() { return episch('Einkaufsrolle', 'Einkauf'); },
  reiter: 'woche',
  render() {
    const wurzel = el('div', {}, el('p', { class: 'leise' }, 'Lade …'));
    lade(wurzel);
    return wurzel;
  },
};

async function lade(wurzel) {
  const montag = location.hash.split('/')[2] || datumSchluessel(aktuellerMontag());
  const [plan, rezepte, daten, angebote, gespeichert] = await Promise.all([
    holePlan(montag), holeRezepte(), holeLebensmittel(), holeAktuelleAngebote(), lese('einstellungen', 'einkauf'),
  ]);
  const zustand = gespeichert?.montag === montag ? gespeichert : { montag, abgehakt: {}, extra: [] };
  const speichern = () => schreibe('einstellungen', 'einkauf', zustand);
  const nachId = new Map(daten.basis.map((l) => [l.id, l]));
  const angeboteMap = angeboteJeLebensmittel(angebote, daten.basis);
  const liste = einkaufsliste(plan, rezepte);

  const gruppen = new Map();
  for (const posten of liste) {
    const lm = nachId.get(posten.lebensmittelId);
    const kat = lm?.kategorie ?? 'sonstiges';
    gruppen.set(kat, [...(gruppen.get(kat) ?? []), { ...posten, lm }]);
  }

  const zeile = (schluessel, text, menge, angebot) => {
    const box = el('input', {
      type: 'checkbox', checked: Boolean(zustand.abgehakt[schluessel]),
      onchange: (e) => { zustand.abgehakt[schluessel] = e.target.checked; zeileEl.classList.toggle('erledigt', e.target.checked); speichern(); },
    });
    const zeileEl = el('label', { class: `einkauf-zeile${zustand.abgehakt[schluessel] ? ' erledigt' : ''}` },
      box,
      el('span', { class: 'einkauf-text' }, text, angebot ? el('span', { class: 'marke angebot-marke' }, `${angebot.markt}: ${preisText(angebot)}`) : null),
      menge ? el('span', { class: 'leise klein' }, menge) : null);
    return zeileEl;
  };

  const extraFeld = el('input', { type: 'text', placeholder: 'Eigener Posten, z. B. Küchenrolle', 'aria-label': 'Eigener Posten' });
  const extraHinzu = () => {
    const text = extraFeld.value.trim();
    if (!text) return;
    zustand.extra.push({ id: Date.now().toString(36), text });
    speichern().then(() => lade(wurzel));
  };
  extraFeld.addEventListener('keydown', (e) => { if (e.key === 'Enter') extraHinzu(); });

  setze(wurzel,
    el('a', { class: 'knopf-text zurueck-link', href: '#/woche' }, icon('zurueck', 18), 'Wochenplan'),
    liste.length ? null : el('section', { class: 'karte willkommen' },
      el('div', { class: 'logo' }, icon('einkauf', 34)),
      el('h2', {}, 'Noch nichts geplant'),
      el('p', { class: 'leise' }, 'Plane im Wochenplan Mahlzeiten oder Rezepte – die Einkaufsliste entsteht dann automatisch.'),
      el('a', { class: 'knopf', href: '#/woche' }, 'Zum Wochenplan')),
    ...[...gruppen.entries()].sort((a, b) => Object.keys(KATEGORIEN).indexOf(a[0]) - Object.keys(KATEGORIEN).indexOf(b[0])).map(([kat, posten]) => el('section', { class: 'karte' },
      el('h2', {}, KATEGORIEN[kat] ?? 'Sonstiges'),
      ...posten.map((p) => zeile(p.lebensmittelId, p.lm?.name ?? p.lebensmittelId, einkaufsMenge(p.gramm, p.lm).text, angeboteMap.get(p.lebensmittelId)?.[0])))),
    el('section', { class: 'karte' },
      el('h2', {}, 'Eigene Posten'),
      ...zustand.extra.map((x) => el('div', { class: 'zeile' },
        zeile(`extra:${x.id}`, x.text, null, null),
        el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Entfernen', onclick: () => { zustand.extra = zustand.extra.filter((y) => y.id !== x.id); speichern().then(() => lade(wurzel)); } }, icon('schliessen', 16)))),
      el('div', { class: 'manuell' }, extraFeld, el('button', { class: 'knopf zweitrangig', type: 'button', onclick: extraHinzu }, 'Hinzufügen'))),
    liste.length ? el('div', { class: 'knopfreihe' },
      el('button', { class: 'knopf zweitrangig', type: 'button', onclick: () => { zustand.abgehakt = {}; speichern().then(() => lade(wurzel)); } }, 'Haken zurücksetzen'),
      navigator.share ? el('button', {
        class: 'knopf zweitrangig', type: 'button',
        onclick: () => navigator.share({
          title: 'Einkaufsliste',
          text: [...liste.map((p) => `• ${nachId.get(p.lebensmittelId)?.name ?? p.lebensmittelId} – ${einkaufsMenge(p.gramm, nachId.get(p.lebensmittelId)).text}`), ...zustand.extra.map((x) => `• ${x.text}`)].join('\n'),
        }).catch(() => {}),
      }, icon('teilen', 18), 'Teilen') : null) : null);
}
