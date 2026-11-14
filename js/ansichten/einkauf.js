// Einkaufsliste einer Woche. Sie wird bei jedem Öffnen aus dem Wochenplan berechnet;
// gespeichert sind nur die Häkchen und die von Hand ergänzten Posten.

import { aktuelleJeZutat, angebotText } from '../logik/angebote.js';
import { formatTag, isoDatum } from '../logik/datum.js';
import { einkaufsliste, listeAlsText, mengeText } from '../logik/plan.js';
import { APP_NAME } from '../logik/schema.js';
import { kategorieName } from '../logik/zutat.js';
import { neuZeichnen } from '../router.js';
import * as speicher from '../speicher.js';
import { el, haenge, hinweis, icon } from '../ui.js';

export async function zeigeEinkauf(wurzel, tage) {
  const woche = tage[0];
  const [posten, rezepte, zutaten, gespeichert, angebote] = await Promise.all([
    speicher.planZwischen(tage[0], tage[6]), speicher.alleRezepte(), speicher.alleZutaten(), speicher.einkaufDerWoche(woche), speicher.alleAngebote(),
  ]);
  // Je Zutat das günstigste Angebot, das heute gilt
  const guenstig = aktuelleJeZutat(angebote, isoDatum());
  const angebotHinweis = (schluessel) => (guenstig.has(schluessel) ? `Angebot ${angebotText(guenstig.get(schluessel)[0])}` : null);
  const liste = einkaufsliste(posten, new Map(rezepte.map((r) => [r.id, r])), new Map(zutaten.map((z) => [z.id, z])));
  const erledigt = new Set(gespeichert.filter((s) => s.schluessel && s.erledigt).map((s) => s.schluessel));
  const eigene = gespeichert.filter((s) => s.eigen).sort((a, b) => String(a.erstellt).localeCompare(String(b.erstellt)));
  const zeitraum = `${formatTag(tage[0])} bis ${formatTag(tage[6])}`;
  document.title = `Einkaufsliste – ${APP_NAME}`;

  // Ein Häkchen ändert nur seine Zeile und den Zähler. Würde die ganze Liste neu gezeichnet,
  // ginge verloren, was gerade im Feld "Noch etwas?" getippt wird.
  const stand = el('p', { class: 'klein', id: 'einkauf-stand' });
  const zeigeStand = () => {
    const gesamt = liste.length + eigene.length;
    const fertig = liste.filter((p) => erledigt.has(p.schluessel)).length + eigene.filter((x) => x.erledigt).length;
    stand.textContent = gesamt ? `${fertig} von ${gesamt} erledigt` : '';
  };
  const hake = async (schluessel, an) => {
    const id = `${woche}|${schluessel}`;
    if (an) { erledigt.add(schluessel); await speicher.speichereEinkauf({ id, woche, schluessel, erledigt: true }); }
    else { erledigt.delete(schluessel); await speicher.loescheEinkauf(id); }
  };
  const zeile = ({ id, name, klein, menge, an, beiWechsel, beiEntfernen }) => el('li', { class: an ? 'haken erledigt' : 'haken' },
    el('label', {},
      el('input', {
        type: 'checkbox', id, checked: an ? true : null,
        onchange: async (e) => {
          e.target.closest('.haken').classList.toggle('erledigt', e.target.checked);
          await beiWechsel(e.target.checked);
          zeigeStand();
        },
      }),
      el('span', { class: 'zeile-name' }, name, klein ? el('small', {}, klein) : null)),
    menge ? el('span', { class: 'zeile-wert' }, menge) : null,
    beiEntfernen ? el('button', { type: 'button', class: 'rund', 'aria-label': `${name} entfernen`, onclick: beiEntfernen }, icon('zu', 20)) : null);

  // Nach Kategorie gruppieren: so liegt zusammen, was im Markt zusammen steht
  const gruppen = [];
  for (const p of liste) {
    if (gruppen.at(-1)?.kategorie !== p.kategorie) gruppen.push({ kategorie: p.kategorie, posten: [] });
    gruppen.at(-1).posten.push(p);
  }

  const teilen = async () => {
    const text = listeAlsText(liste, eigene, erledigt, `Einkauf ${zeitraum}`);
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); hinweis('Liste kopiert.'); }
    } catch (fehler) {
      if (fehler.name !== 'AbortError') hinweis('Teilen hat nicht geklappt.');
    }
  };

  const neuerPosten = el('input', { id: 'f-eigener-posten', 'aria-label': 'Eigener Posten', placeholder: 'Noch etwas? Zum Beispiel Spülmittel', maxlength: 80, autocomplete: 'off', enterkeyhint: 'done' });
  const ergaenze = async (e) => {
    e.preventDefault();
    const name = neuerPosten.value.trim();
    if (!name) { neuerPosten.focus(); return; }
    await speicher.speichereEinkauf({ woche, eigen: true, name, erledigt: false, erstellt: new Date().toISOString() });
    neuZeichnen();
  };

  const gesamt = liste.length + eigene.length;
  zeigeStand();

  haenge(wurzel,
    el('a', { class: 'zurueck', href: `#/woche/${woche}` }, icon('zurueck', 18), 'Wochenplan'),
    el('header', { class: 'detailkopf' },
      el('h1', {}, 'Einkaufsliste'),
      el('p', {}, zeitraum),
      gesamt ? stand : null),
    liste.length === 0 && eigene.length === 0 ? el('p', { class: 'leer' }, 'Die Liste ist leer. Plane Mahlzeiten für diese Woche, dann stehen die Zutaten hier.') : null,
    gruppen.map((g) => [
      el('h2', {}, kategorieName(g.kategorie)),
      el('ul', { class: 'zeilen' }, g.posten.map((p) => zeile({
        id: `haken-${p.schluessel}`, name: p.name, klein: [p.marke, angebotHinweis(p.schluessel)].filter(Boolean).join(', '), an: erledigt.has(p.schluessel),
        menge: p.stueck ? `${mengeText(p.gramm)}, etwa ${p.stueck} Stück` : mengeText(p.gramm),
        beiWechsel: (an) => hake(p.schluessel, an),
      }))),
    ]),
    eigene.length ? el('h2', {}, 'Eigene Posten') : null,
    eigene.length ? el('ul', { class: 'zeilen' }, eigene.map((x) => zeile({
      id: `haken-${x.id}`, name: x.name, an: x.erledigt,
      beiWechsel: async (an) => { x.erledigt = an; await speicher.speichereEinkauf(x); },
      beiEntfernen: async () => { await speicher.loescheEinkauf(x.id); neuZeichnen(); },
    }))) : null,
    el('form', { class: 'zusatz', onsubmit: ergaenze }, neuerPosten, el('button', { type: 'submit', class: 'knopf leise' }, 'Dazu')),
    gesamt ? el('div', { class: 'knopfreihe' }, el('button', { type: 'button', class: 'knopf leise', onclick: teilen }, 'Offene Posten teilen')) : null);
}
