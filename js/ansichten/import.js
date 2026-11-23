// Rezept importieren: eingefügten oder geteilten Text lesen, Vorschlag zeigen, ins Rezeptformular übernehmen.
// Die App ruft dabei keine fremden Seiten ab; verarbeitet wird nur, was eingefügt oder geteilt wurde.

import { alsVorlage, leseRezept, ordneZu } from '../logik/import.js';
import { lesePlanImport, promptVorlage } from '../logik/planimport.js';
import { bereinigeBildunterschrift, ordneGeteiltesEin } from '../logik/teilen.js';
import { teileText } from '../plattform.js';
import { APP_NAME } from '../logik/schema.js';
import { gehe } from '../router.js';
import * as speicher from '../speicher.js';
import { el, haenge, hinweis, icon, zahl } from '../ui.js';

export const GETEILT_SCHLUESSEL = 'elan.geteilt';

// Der Entwurf wandert einmalig von hier ins Rezeptformular
let entwurf = null;
/** Ein Rezept ohne id als Vorlage für das Formular hinterlegen (Import, Kopie) */
export function setzeEntwurf(rezept) {
  entwurf = rezept;
}

export function nimmEntwurf() {
  const e = entwurf;
  entwurf = null;
  return e;
}

let text = '';
// Link eines geteilten Beitrags: bleibt erhalten, wenn danach die Antwort eines Chats ins Feld kommt
let quelleLink = null;

export async function zeigeImport(wurzel) {
  const zutaten = await speicher.alleZutaten();
  document.title = `Rezept importieren – ${APP_NAME}`;
  // Über das Teilen-Menü von Android hereingekommener Text (siehe js/main.js)
  try {
    const geteilt = sessionStorage.getItem(GETEILT_SCHLUESSEL);
    if (geteilt) { text = geteilt; sessionStorage.removeItem(GETEILT_SCHLUESSEL); }
  } catch { /* ohne Speicherzugriff bleibt das Feld leer */ }

  const ergebnis = el('div', { class: 'stapel', id: 'import-ergebnis', 'aria-live': 'polite' });
  const feldText = el('textarea', {
    id: 'f-import-text', rows: 9, 'aria-label': 'Rezepttext',
    placeholder: 'Rezept hier einfügen. Am besten mit den Überschriften „Zutaten“ und „Zubereitung“.',
    oninput: (e) => { text = e.target.value; },
  }, text);

  const erkenne = () => {
    const eingabe = text.trim();
    if (!eingabe) { ergebnis.replaceChildren(el('p', { class: 'fehlertext', role: 'alert' }, 'Füge zuerst einen Rezepttext ein.')); feldText.focus(); return; }
    // Antwort eines Chats im Format elan-import (Prompt-Brücke, P5.3)
    if (/"format"\s*:\s*"elan-import"/.test(eingabe)) {
      const gelesen = lesePlanImport(eingabe, { zutaten });
      const r = gelesen.ok ? gelesen.rezepte[0] : null;
      if (!r) { ergebnis.replaceChildren(el('p', { class: 'fehlertext', role: 'alert' }, gelesen.ok ? 'Die Antwort enthält kein Rezept.' : gelesen.fehler.join(' '))); return; }
      zeigeVorschlag({ name: r.name, portionen: r.portionen, schritte: r.schritte, zutaten: [] }, r.zutaten.map((z) => ({ ...z, roh: z.name })), 'chat', gelesen.quelle?.link ?? quelleLink);
      return;
    }
    // Eingefügter Seitenquelltext mit Rezeptdaten (Schema.org) geht vor: Er enthält auch Links, ist aber keine Bildunterschrift
    const roh = leseRezept(eingabe);
    if (roh.quelle === 'schema') { zeigeVorschlag(roh.rezept, ordneZu(roh.rezept.zutaten, zutaten), 'schema', null); return; }
    const geteilt = ordneGeteiltesEin(eingabe);
    if (geteilt.link) quelleLink = geteilt.link;
    // Nur ein Link (meist ein Video): Elan lädt nichts. Weg über einen Chat anbieten
    if (geteilt.link && geteilt.nurLink) { zeigeBruecke(geteilt, 'Hier steht nur ein Link, kein Rezepttext. Elan ruft keine fremden Seiten ab und öffnet keine Videos.'); return; }
    const { quelle, rezept } = geteilt.link ? leseRezept(bereinigeBildunterschrift(geteilt.text)) : roh;
    if (!rezept.zutaten.length && !rezept.schritte.length) {
      if (geteilt.link) { zeigeBruecke(geteilt, 'In der Bildunterschrift habe ich kein Rezept gefunden.'); return; }
      ergebnis.replaceChildren(el('p', { class: 'merkzettel' }, 'Darin habe ich kein Rezept erkannt. Am besten klappt es mit den Überschriften „Zutaten“ und „Zubereitung“ und einer Zutat je Zeile.'));
      return;
    }
    zeigeVorschlag(rezept, ordneZu(rezept.zutaten, zutaten), geteilt.link ? 'teilen' : quelle, geteilt.link);
  };

  // Prompt-Brücke: Vorlage mit Link und Bildunterschrift kopieren, im Chat fragen, Antwort hier einfügen
  const zeigeBruecke = (geteilt, grund) => {
    const kopiere = async () => {
      const inhalt = [`Rezept aus diesem Beitrag${geteilt.plattform ? ` (${geteilt.plattform.name})` : ''}: ${geteilt.link}`, geteilt.text].filter(Boolean).join('\n');
      try {
        if ((await teileText(promptVorlage({ inhalt }), 'Rezept per Chat holen')) === 'kopiert') hinweis('Prompt kopiert. Im Chat einfügen, Antwort hierher kopieren.');
      } catch { hinweis('Kopieren hat nicht geklappt.'); }
    };
    ergebnis.replaceChildren(el('div', { class: 'merkzettel', id: 'import-bruecke' },
      el('p', {}, grund),
      el('p', {}, 'So holst du das Rezept trotzdem: Prompt kopieren, in einem Claude-Chat einfügen (am besten mit dem, was du im Video siehst oder hörst), die Antwort komplett kopieren, hier ins Feld einfügen und „Rezept erkennen“ tippen.'),
      el('button', { type: 'button', class: 'knopf', onclick: kopiere }, 'Prompt kopieren')));
  };

  const zeigeVorschlag = (rezept, zugeordnet, quelle, link) => {
    const gefunden = zugeordnet.filter((z) => z.treffer).length;
    const zusatz = (z) => {
      if (!z.treffer) return 'nicht gefunden, bitte im Formular von Hand ergänzen';
      const menge = z.gramm === null ? 'Menge fehlt' : `${zahl(z.gramm, 1)} g${z.unsicher ? ' (geschätzt)' : ''}`;
      return `wird zu ${z.treffer.name}, ${menge}`;
    };
    ergebnis.replaceChildren(
      el('h2', {}, rezept.name || 'Rezept ohne Namen'),
      el('p', { class: 'klein' }, [
        { schema: 'Gelesen aus den Rezeptdaten der Seite.', teilen: 'Gelesen aus der Bildunterschrift.', chat: 'Gelesen aus der Antwort des Chats.' }[quelle] ?? 'Gelesen aus dem Text.',
        rezept.portionen ? `${zahl(rezept.portionen, 1)} ${rezept.portionen === 1 ? 'Portion' : 'Portionen'}.` : 'Portionen nicht gefunden, Startwert ist 4.',
        `${gefunden} von ${zugeordnet.length} Zutaten zugeordnet, ${rezept.schritte.length} ${rezept.schritte.length === 1 ? 'Schritt' : 'Schritte'}.`,
      ].join(' ')),
      zugeordnet.length ? el('ul', { class: 'zeilen' }, zugeordnet.map((z) => el('li', { class: z.treffer ? 'zeile' : 'zeile offen' },
        el('span', { class: 'zeile-name' }, z.roh, el('small', {}, zusatz(z)))))) : null,
      el('p', { class: 'klein' }, 'Das ist ein Vorschlag. Im Formular prüfst du Zutaten und Mengen, bevor du speicherst.'),
      el('div', { class: 'knopfreihe' }, el('button', {
        type: 'button', class: 'knopf',
        onclick: () => { entwurf = { ...alsVorlage(rezept, zugeordnet), ...(link ? { quelle: link } : {}) }; text = ''; quelleLink = null; gehe('/rezepte/neu'); },
      }, 'Ins Rezeptformular übernehmen')));
  };

  haenge(wurzel,
    el('a', { class: 'zurueck', href: '#/rezepte' }, icon('zurueck', 18), 'Rezepte'),
    el('header', { class: 'detailkopf' },
      el('h1', {}, 'Rezept importieren'),
      el('p', {}, 'Füge den Text eines Rezepts ein oder teile ihn aus einer anderen App mit Elan.')),
    feldText,
    el('div', { class: 'knopfreihe' }, el('button', { type: 'button', class: 'knopf', onclick: erkenne }, 'Rezept erkennen')),
    ergebnis);
  // Geteilter Text: gleich zeigen, was erkannt wird
  if (text.trim()) erkenne();
}
