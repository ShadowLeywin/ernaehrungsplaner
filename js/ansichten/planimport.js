// Plan importieren (P2): Vorlage für einen Chat kopieren, Antwort einfügen, prüfen, ansehen, übernehmen.
// Elan schickt nichts an einen Chat und ruft nichts ab: Léon kopiert selbst hin und zurück.
// Gespeichert wird erst bei „Übernehmen“; „Rückgängig“ löscht genau, was dabei angelegt wurde.

import { formatLang, isoDatum } from '../logik/datum.js';
import { summeEintraege } from '../logik/naehrwerte.js';
import { MAX_TAGE, baueUebernahme, lesePlanImport, offeneZutaten, promptVorlage } from '../logik/planimport.js';
import { APP_NAME } from '../logik/schema.js';
import { normalisiere } from '../logik/suche.js';
import { monatUm, monatVon, verschiebeMonat } from '../logik/zeitraum.js';
import { SLOTS } from '../logik/ziele.js';
import { teileText } from '../plattform.js';
import { gehe, neuZeichnen } from '../router.js';
import * as speicher from '../speicher.js';
import { el, haenge, hinweis, icon, zahl } from '../ui.js';

// Getipptes und die Vorschau überleben ein Neuzeichnen
const entwurf = { text: '', von: null, bis: null, ergebnis: null, wahl: new Map() };
const slotName = (id) => SLOTS.find((s) => s.id === id)?.name ?? id;

export async function zeigePlanImport(wurzel) {
  const heute = isoDatum();
  // Vorschlag: der nächste Monat, so wie ein Monatsplan meist gemacht wird
  const naechster = monatUm(`${verschiebeMonat(monatVon(heute), 1)}-01`);
  entwurf.von ??= naechster.von;
  entwurf.bis ??= naechster.bis;
  const [zutaten, rezepte] = await Promise.all([speicher.alleZutaten(), speicher.alleRezepte()]);
  document.title = `Plan importieren – ${APP_NAME}`;

  const von = el('input', { type: 'date', id: 'f-import-von', value: entwurf.von, onchange: (e) => { entwurf.von = e.target.value; } });
  const bis = el('input', { type: 'date', id: 'f-import-bis', value: entwurf.bis, onchange: (e) => { entwurf.bis = e.target.value; } });
  const kopiere = async () => {
    try {
      if ((await teileText(promptVorlage({ von: entwurf.von, bis: entwurf.bis }), 'Vorlage für den Plan-Import')) === 'kopiert') hinweis('Vorlage kopiert. Füge sie im Chat ein, dazu deinen Plan.');
    } catch {
      hinweis('Kopieren hat nicht geklappt.');
    }
  };

  const feld = el('textarea', {
    id: 'f-planimport-text', rows: 8, 'aria-label': 'Antwort des Chats',
    placeholder: 'Antwort des Chats hier einfügen ({"format": "elan-import", …})',
    oninput: (e) => { entwurf.text = e.target.value; },
  }, entwurf.text);
  const fehlerText = el('p', { class: 'fehlertext', role: 'alert', id: 'f-planimport-fehler' });
  const pruefe = () => {
    if (!entwurf.text.trim()) { fehlerText.textContent = 'Füge zuerst die Antwort des Chats ein.'; feld.focus(); return; }
    const ergebnis = lesePlanImport(entwurf.text, { zutaten, rezepte });
    if (!ergebnis.ok) { entwurf.ergebnis = null; fehlerText.textContent = ergebnis.fehler.join(' '); return; }
    entwurf.ergebnis = ergebnis;
    entwurf.wahl = new Map();
    neuZeichnen();
  };

  haenge(wurzel,
    el('a', { class: 'zurueck', href: '#/woche' }, icon('zurueck', 18), 'Plan'),
    el('header', { class: 'detailkopf' },
      el('h1', {}, 'Plan importieren'),
      el('p', {}, 'Deinen Ernährungsplan aus einem Chat übernehmen. Nährwerte rechnet Elan selbst, aus seinen Zutaten.')),

    el('h2', {}, '1. Vorlage kopieren'),
    el('div', { class: 'zeitraum-frei' },
      el('div', { class: 'feld' }, el('label', { for: 'f-import-von' }, 'Von'), von),
      el('div', { class: 'feld' }, el('label', { for: 'f-import-bis' }, 'Bis'), bis)),
    el('p', { class: 'klein' }, `Die Vorlage sagt dem Chat, wie die Antwort aussehen muss. Höchstens ${MAX_TAGE} Tage auf einmal.`),
    el('button', { type: 'button', class: 'knopf leise', onclick: kopiere }, 'Vorlage kopieren'),

    el('h2', {}, '2. Antwort einfügen'),
    feld,
    fehlerText,
    el('button', { type: 'button', class: 'knopf', onclick: pruefe }, 'Prüfen'),

    entwurf.ergebnis ? vorschau(entwurf.ergebnis, { zutaten, rezepte }) : null);
}

function vorschau(ergebnis, { zutaten, rezepte }) {
  const offen = offeneZutaten(ergebnis);
  const nachName = new Map(zutaten.map((z) => [normalisiere(z.name), z]));
  const tage = [...new Set(ergebnis.plan.map((p) => p.datum))];
  // Vorschau ohne Kennungen: dieselbe Rechnung wie beim Übernehmen, damit gezeigt wird, was gespeichert würde
  const probe = baueUebernahme(ergebnis, { wahl: entwurf.wahl, vorhandene: rezepte, neueId: () => 'vorschau' });

  const wahlFeld = (name) => {
    const id = `f-wahl-${normalisiere(name).replace(/ /g, '-')}`;
    const gewaehlt = entwurf.wahl.get(normalisiere(name));
    return el('li', { class: 'zeile wahl-zeile' },
      el('label', { for: id, class: 'zeile-name' }, name, el('small', {}, gewaehlt ? `wird zu ${gewaehlt.name}` : 'unbekannt: Zutat wählen oder auslassen')),
      el('input', {
        id, list: 'planimport-zutaten', autocomplete: 'off', placeholder: 'Zutat', value: gewaehlt?.name ?? '',
        onchange: (e) => {
          const z = nachName.get(normalisiere(e.target.value));
          if (z) entwurf.wahl.set(normalisiere(name), z); else entwurf.wahl.delete(normalisiere(name));
          neuZeichnen();
        },
      }));
  };

  const uebernimm = async () => {
    const u = baueUebernahme(ergebnis, { wahl: entwurf.wahl, vorhandene: rezepte, neueId: () => crypto.randomUUID() });
    for (const r of u.rezepte) await speicher.speichereRezept(r);
    for (const p of u.plan) await speicher.speicherePlan(p);
    const erster = u.plan[0]?.datum;
    entwurf.text = '';
    entwurf.ergebnis = null;
    hinweis(`${u.plan.length} Plan-Einträge und ${u.rezepte.length} ${u.rezepte.length === 1 ? 'Rezept' : 'Rezepte'} übernommen.`, {
      aktion: 'Rückgängig',
      beiAktion: async () => {
        for (const p of u.plan) await speicher.loeschePlan(p.id);
        for (const r of u.rezepte) await speicher.loescheRezept(r.id);
        hinweis('Import zurückgenommen.');
        neuZeichnen();
      },
    });
    gehe(erster ? `/woche/monat/${monatVon(erster)}` : '/woche');
  };

  return el('section', { class: 'stapel', id: 'planimport-vorschau', 'aria-label': 'Vorschau' },
    el('h2', {}, '3. Prüfen und übernehmen'),
    el('p', { id: 'planimport-stand' }, `${probe.plan.length} Plan-Einträge an ${tage.length} ${tage.length === 1 ? 'Tag' : 'Tagen'}, ${probe.rezepte.length} ${probe.rezepte.length === 1 ? 'neues Rezept' : 'neue Rezepte'}${ergebnis.rezepte.some((r) => r.vorhanden) ? `, ${ergebnis.rezepte.filter((r) => r.vorhanden).length} schon in Elan` : ''}.`),
    ergebnis.abgelehnt.length ? el('div', { class: 'merkzettel', id: 'planimport-abgelehnt' },
      el('strong', {}, `${ergebnis.abgelehnt.length} ${ergebnis.abgelehnt.length === 1 ? 'Zeile' : 'Zeilen'} nicht übernommen:`),
      el('ul', {}, ergebnis.abgelehnt.map((a) => el('li', {}, `${a.wo}: ${a.grund}`)))) : null,
    offen.length ? [
      el('h3', {}, 'Unbekannte Zutaten'),
      el('datalist', { id: 'planimport-zutaten' }, zutaten.map((z) => el('option', { value: z.name }))),
      el('ul', { class: 'zeilen', id: 'planimport-offen' }, offen.map(wahlFeld)),
    ] : null,
    probe.ausgelassen.length ? el('p', { class: 'klein' }, `Ausgelassen: ${probe.ausgelassen.join('; ')}.`) : null,
    el('ul', { class: 'zeilen', id: 'planimport-tage' }, tage.map((datum) => {
      const posten = probe.plan.filter((p) => p.datum === datum);
      return el('li', { class: 'zeile' },
        el('span', { class: 'zeile-name' }, formatLang(datum),
          el('small', {}, posten.length ? posten.map((p) => `${slotName(p.slot)}: ${p.name}`).join(' · ') : 'nichts zuordenbar')),
        el('span', { class: 'zeile-wert' }, `${zahl(summeEintraege(posten).kcal ?? 0)} kcal`));
    })),
    el('div', { class: 'knopfreihe' },
      el('button', { type: 'button', class: 'knopf leise', onclick: () => { entwurf.ergebnis = null; neuZeichnen(); } }, 'Verwerfen'),
      el('button', { type: 'button', class: 'knopf', disabled: probe.plan.length || probe.rezepte.length ? null : true, onclick: uebernimm }, 'Übernehmen')));
}
