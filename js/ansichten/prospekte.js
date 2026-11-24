// Prospekte (P4): Angebote je Markt aus der eigenen Angebotsdatei, wie im Prospekt nach Kategorien, und Links zu den
// Original-Prospekten der Händler. Elan lädt keine Prospekte und speichert keine Prospektbilder (Entscheidung E4.1).
// Angebote kommen aus Screenshots, die Léon selbst macht: Ein Chat liest sie ab, die Antwort wird hier eingefügt.

import { angeboteAusArtikeln, angebotsPrompt, leseAngebotsAntwort, mischeProspekt } from '../logik/angebotsprompt.js';
import { formatKurz, isoDatum } from '../logik/datum.js';
import { einkaufsliste } from '../logik/plan.js';
import { euroText } from '../logik/preise.js';
import { leseAngebotsDateiBeliebig, linkFuer, prospektSeiten } from '../logik/prospekt.js';
import { APP_NAME } from '../logik/schema.js';
import { wocheUm } from '../logik/zeitraum.js';
import { kategorieName } from '../logik/zutat.js';
import { oeffneExtern, teileText } from '../plattform.js';
import { neuZeichnen } from '../router.js';
import * as speicher from '../speicher.js';
import { el, haenge, hinweis, icon } from '../ui.js';

// Gewählter Markt und die eingefügte Antwort überleben ein Neuzeichnen
const entwurf = { markt: null, antwort: '' };
const kurz = (iso) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;

export async function zeigeProspekte(wurzel) {
  const heute = isoDatum();
  const woche = wocheUm(heute);
  const [prospekt, zutaten, maerkte, mitgeliefert, posten, rezepte] = await Promise.all([
    speicher.einstellung('prospekt'), speicher.alleZutaten(), speicher.alleMaerkte(), speicher.ladeProspektLinks(), speicher.planZwischen(woche.von, woche.bis), speicher.alleRezepte(),
  ]);
  // Was diese Woche auf der Einkaufsliste steht, wird im Prospekt markiert
  const liste = einkaufsliste(posten, new Map(rezepte.map((r) => [r.id, r])), new Map(zutaten.map((z) => [z.id, z])));
  const aufListe = new Set(liste.map((p) => p.schluessel));
  const seiten = prospekt ? prospektSeiten(prospekt.artikel ?? [], heute, aufListe) : [];
  const gewaehlt = seiten.find((s) => s.markt === entwurf.markt) ?? seiten[0] ?? null;
  document.title = `Prospekte – ${APP_NAME}`;

  const meldung = el('p', { class: 'klein', id: 'prospekt-meldung', role: 'status' });
  // Datei und eingefügte Antwort landen gleich: Ein Prospekt mischt sich je Markt in die gespeicherten Angebote,
  // damit Markt für Markt eingelesen werden kann. Eine ältere Datei (Version 1) ersetzt wie bisher alles.
  const uebernimm = async (ergebnis) => {
    if (ergebnis.prospekt) {
      const gemischt = mischeProspekt(prospekt, ergebnis.prospekt, heute);
      await speicher.ersetzeDateiAngebote(angeboteAusArtikeln(gemischt.artikel));
      await speicher.setzeEinstellung('prospekt', gemischt);
    } else await speicher.ersetzeDateiAngebote(ergebnis.angebote);
    entwurf.markt = ergebnis.prospekt?.artikel[0]?.markt ?? null;
    hinweis([
      ergebnis.prospekt ? `${ergebnis.prospekt.artikel.length} Artikel geladen.` : `${ergebnis.angebote.length} Angebote geladen (ältere Datei ohne Prospekt).`,
      ergebnis.angebote.length ? `${ergebnis.angebote.length} davon bei deinen Zutaten.` : null,
      ergebnis.ungueltig ? `${ergebnis.ungueltig} ${ergebnis.ungueltig === 1 ? 'Zeile' : 'Zeilen'} ungültig.` : null,
    ].filter(Boolean).join(' '));
    neuZeichnen();
  };
  const liesDatei = async (e) => {
    const datei = e.target.files?.[0];
    e.target.value = '';
    if (!datei) return;
    let ergebnis;
    try { ergebnis = leseAngebotsDateiBeliebig(JSON.parse(await datei.text()), zutaten); } catch { ergebnis = { ok: false, fehler: ['Die Datei ist kein gültiges JSON.'] }; }
    if (!ergebnis.ok) { meldung.className = 'fehlertext'; meldung.textContent = ergebnis.fehler.join(' '); return; }
    await uebernimm(ergebnis);
  };

  // Screenshots: Prompt kopieren, Antwort des Chats einfügen
  const kopierePrompt = async () => {
    const text = angebotsPrompt({ heute, maerkte: maerkte.map((m) => m.marke || m.name), brauche: liste.map((p) => p.name) });
    try {
      if ((await teileText(text, 'Angebote aus Screenshots')) === 'kopiert') hinweis('Prompt kopiert. In einem Claude-Chat einfügen und die Screenshots dazu schicken.');
    } catch {
      hinweis('Kopieren hat nicht geklappt.');
    }
  };
  const antwortFeld = el('textarea', {
    id: 'f-angebote-antwort', rows: 6, 'aria-label': 'Antwort des Chats', 'aria-describedby': 'f-angebote-fehler',
    placeholder: 'Antwort des Chats hier einfügen ({"format": "elan-angebote", …})',
    oninput: (e) => { entwurf.antwort = e.target.value; },
  }, entwurf.antwort);
  const antwortFehler = el('p', { class: 'fehlertext', id: 'f-angebote-fehler', role: 'alert' });
  const liesAntwort = async () => {
    const ergebnis = leseAngebotsAntwort(entwurf.antwort, zutaten);
    if (!ergebnis.ok) { antwortFehler.textContent = ergebnis.fehler.join(' '); antwortFeld.focus(); return; }
    if (!ergebnis.prospekt.artikel.length) { antwortFehler.textContent = 'In der Antwort steht kein gültiges Angebot.'; return; }
    entwurf.antwort = '';
    await uebernimm(ergebnis);
  };

  const linkKnopf = (link, name) => el('button', {
    type: 'button', class: 'knopf leise prospekt-link',
    onclick: () => { if (!oeffneExtern(link.url)) hinweis('Dieser Link lässt sich nicht öffnen.'); },
  }, link.art === 'prospekt' ? `Prospekt von ${name} öffnen` : `Website von ${name} öffnen`);

  // Original-Prospekte der eigenen Märkte, ohne Datei nutzbar
  const meineLinks = maerkte.map((m) => ({ m, link: linkFuer(m, prospekt?.links, mitgeliefert.ketten) })).filter((x) => x.link);
  const gesehen = new Set();
  const eindeutig = meineLinks.filter(({ link }) => !gesehen.has(link.url) && gesehen.add(link.url));

  const kachel = (a) => el('li', { class: a.aufListe ? 'prospekt-kachel auf-liste' : 'prospekt-kachel' },
    a.aufListe ? el('span', { class: 'marke' }, 'auf deiner Liste') : null,
    el('strong', { class: 'prospekt-preis' }, euroText(a.preis)),
    el('span', { class: 'prospekt-artikel' }, a.artikel),
    el('small', {}, [a.menge, a.grundpreis, a.gueltigBis ? `bis ${kurz(a.gueltigBis)}` : null].filter(Boolean).join(' · ')));

  const linkDesMarkts = gewaehlt ? linkFuer({ markt: gewaehlt.markt }, prospekt?.links, mitgeliefert.ketten) : null;

  haenge(wurzel,
    el('a', { class: 'zurueck', href: '#/angebote' }, icon('zurueck', 18), 'Angebote'),
    el('header', { class: 'detailkopf' },
      el('h1', {}, 'Prospekte'),
      el('p', {}, 'Angebote je Markt wie im Prospekt, aus Screenshots oder einer Angebotsdatei. Was auf deiner Einkaufsliste dieser Woche steht, ist markiert.')),

    eindeutig.length ? [
      el('h2', {}, 'Original-Prospekte'),
      el('div', { class: 'stapel', id: 'prospekt-links' }, eindeutig.map(({ m, link }) => linkKnopf(link, link.kette ?? m.name))),
      el('p', { class: 'klein' }, 'Öffnet die Seite des Händlers im Browser. Elan lädt dabei nichts herunter.'),
    ] : null,

    el('h2', {}, 'Aus Screenshots einlesen'),
    el('ol', { class: 'schritte klein', id: 'angebote-schritte' },
      el('li', {}, 'Prospekt öffnen und die Seiten mit Lebensmitteln als Screenshot speichern.'),
      el('li', {}, 'Prompt kopieren, in einem Claude-Chat einfügen und die Screenshots dazu schicken.'),
      el('li', {}, 'Die Antwort des Chats hier einfügen und laden. Je Markt ersetzt sie dessen alte Angebote.')),
    el('button', { type: 'button', class: 'knopf', onclick: kopierePrompt }, 'Angebots-Prompt kopieren'),
    antwortFeld,
    antwortFehler,
    el('button', { type: 'button', class: 'knopf leise', onclick: liesAntwort }, 'Antwort laden'),

    el('h2', {}, 'Deine Angebote'),
    prospekt ? el('p', { class: 'klein', id: 'prospekt-stand' }, [prospekt.stand ? `Stand ${prospekt.stand.length === 10 ? formatKurz(prospekt.stand) : prospekt.stand}` : null, prospekt.quelle ? `Quelle: ${prospekt.quelle}` : null].filter(Boolean).join(' · ')) : null,
    !seiten.length ? el('p', { class: 'leer' }, prospekt ? 'Gerade gilt kein Angebot aus der Datei.' : 'Noch keine Angebotsdatei. Lade eine Datei im Format „elan-angebote“; sie bleibt nur auf diesem Gerät.') : null,
    seiten.length > 1 ? el('div', { class: 'prospekt-maerkte', role: 'group', 'aria-label': 'Markt' }, seiten.map((s) => el('button', {
      type: 'button', class: 'chip', 'aria-pressed': String(s === gewaehlt), onclick: () => { entwurf.markt = s.markt; neuZeichnen(); },
    }, `${s.markt} (${s.anzahl})`))) : null,
    gewaehlt ? el('section', { class: 'prospekt', id: 'prospekt-seite', 'aria-label': `Prospekt ${gewaehlt.markt}` },
      el('h3', {}, gewaehlt.markt),
      linkDesMarkts ? linkKnopf(linkDesMarkts, gewaehlt.markt) : null,
      gewaehlt.kategorien.map((k) => [
        el('h4', {}, kategorieName(k.kategorie)),
        el('ul', { class: 'prospekt-raster' }, k.artikel.map(kachel)),
      ])) : null,

    meldung,
    el('div', { class: 'knopfreihe' },
      el('label', { class: 'knopf leise', for: 'f-prospekt-datei' }, 'Angebotsdatei laden'),
      el('input', { type: 'file', accept: 'application/json,.json', class: 'unsichtbar', id: 'f-prospekt-datei', onchange: liesDatei })));
}
