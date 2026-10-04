// Freunde: eigene Rangkarte als Link teilen, Karten von Freunden öffnen, speichern und vergleichen.
// Kein Server: Die Karte steckt im Link. Gespeichert wird nur lokal (einstellungen/freunde).
import { el, setze } from '../ui.js';
import { icon } from '../icons.js';
import { lese, schreibe } from '../db.js';
import { episch } from '../darstellung.js';
import { ladeSpielstand } from '../spiel.js';
import { erstelleKarte, kodiereKarte, dekodiereKarte, codeAusLink } from '../logic/rangkarte.js';
import { RAENGE, GRUPPEN, STUFEN_TEXT } from '../logic/raenge.js';
import { WERTE, klassenName } from '../logic/charakter.js';
import { rangEmblem } from './emblem.js';
import { titelName } from '../logic/geschichte.js';

const datumKurz = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'numeric', year: 'numeric' });

export const freunde = {
  get titel() { return episch('Gefährten', 'Freunde'); },
  reiter: 'mehr',
  render() {
    const wurzel = el('div', {}, el('p', { class: 'leise' }, 'Lade …'));
    lade(wurzel);
    return wurzel;
  },
};

/** Karte aus dem Link wieder in die Form bringen, die rangEmblem versteht. */
const alsRang = (r) => (r ? { rang: RAENGE.find((x) => x.id === r.rangId), stufe: r.stufe } : null);
const rangText = (r) => (r ? `${RAENGE.find((x) => x.id === r.rangId).name}${r.stufe ? ` ${STUFEN_TEXT[r.stufe]}` : ''}` : '–');

async function lade(wurzel) {
  const [stand, gespeichert] = await Promise.all([ladeSpielstand(), lese('einstellungen', 'freunde')]);
  const liste = gespeichert ?? [];
  const eigene = dekodiereKarte(kodiereKarte(erstelleKarte(stand, stand.profil.name)));
  const teile = location.hash.split('/');
  const fremderCode = teile[2] === 'karte' ? teile[3] : null;

  const speichern = async (neueListe) => { await schreibe('einstellungen', 'freunde', neueListe); lade(wurzel); };

  if (fremderCode) {
    const karte = dekodiereKarte(fremderCode);
    setze(wurzel,
      zurueck(),
      karte ? kartenAnsicht(karte, episch('Eine Rangkarte erreicht dein Lager', 'Rangkarte eines Freundes')) : el('p', { class: 'warnung' }, 'Diese Rangkarte ist ungültig oder beschädigt.'),
      karte ? vergleich(eigene, karte) : null,
      karte ? el('div', { class: 'knopfreihe' },
        el('button', {
          class: 'knopf', type: 'button',
          onclick: () => {
            const id = `${karte.name || 'freund'}-${Date.now().toString(36)}`;
            // Gleicher Name: alte Karte ersetzen (Update vom Freund)
            const ohneAlte = liste.filter((f) => !(karte.name && f.karte.name === karte.name));
            speichern([...ohneAlte, { id, code: fremderCode, karte, gespeichertAm: new Date().toISOString() }]).then(() => { location.hash = '#/freunde'; });
          },
        }, icon('plus', 18), 'Als Freund speichern')) : null);
    return;
  }

  const linkFeld = el('input', { type: 'text', placeholder: 'Link einer Rangkarte einfügen', 'aria-label': 'Link einer Rangkarte' });
  const fehler = el('p', { class: 'warnung klein', role: 'alert' });
  const oeffnen = () => {
    const code = codeAusLink(linkFeld.value);
    if (!code || !dekodiereKarte(code)) { fehler.textContent = 'Das ist kein gültiger Rangkarten-Link.'; return; }
    location.hash = `#/freunde/karte/${code}`;
  };

  setze(wurzel,
    kartenAnsicht(eigene, episch('Deine Rangkarte', 'Deine Rangkarte')),
    teilenBereich(stand),
    el('h2', { class: 'abschnitt' }, episch('Deine Gefährten', 'Freunde')),
    liste.length ? null : el('p', { class: 'leise klein' }, 'Noch keine Freunde gespeichert. Schick deine Karte – und lass dir ihre schicken.'),
    ...liste.map((f) => freundZeile(f, eigene, () => speichern(liste.filter((x) => x.id !== f.id)))),
    el('section', { class: 'karte' },
      el('h2', {}, 'Karte eines Freundes öffnen'),
      el('div', { class: 'manuell' }, linkFeld, el('button', { class: 'knopf zweitrangig', type: 'button', onclick: oeffnen }, 'Öffnen')),
      fehler,
      el('p', { class: 'leise klein' }, 'Datenschutz: Eine Rangkarte enthält nur Name, Titel, Level, Klasse, Ränge, Werte, die Anzahl der Erfolge und deine Monatswerte fürs Duell (Workouts, Tonnen, Klimmzüge, aktive Tage) – kein Gewicht, keine Ernährung. Sie wird nirgends hochgeladen, sondern steckt im Link.')));
}

function zurueck() {
  return el('a', { class: 'knopf-text zurueck-link', href: '#/freunde' }, icon('zurueck', 18), episch('Gefährten', 'Freunde'));
}

function kartenAnsicht(k, titel) {
  const [kEpisch, kSchlicht] = klassenName(k.klasse) ?? ['Unbekannt', 'Unbekannt'];
  return el('section', { class: 'karte rangkarte' },
    el('p', { class: 'leise klein' }, titel),
    el('div', { class: 'rangkarte-kopf' },
      rangEmblem(alsRang(k.gesamt), 72),
      el('div', {},
        el('h2', {}, k.name || episch('Namenloser Held', 'Ohne Namen')),
        k.titel && titelName(k.titel) ? el('p', { class: 'held-titel' }, `„${titelName(k.titel)}“`) : null,
        el('p', { class: 'held-klasse' }, `${episch(kEpisch, kSchlicht)} · Lvl ${k.level}`),
        el('p', { class: 'leise klein' }, `Gesamtrang: ${rangText(k.gesamt)} · ${k.erfolge} Erfolge${k.datum ? ` · Stand ${datumKurz.format(new Date(`${k.datum}T12:00:00`))}` : ''}`))),
    el('div', { class: 'rangkarte-gruppen' }, ...Object.entries(GRUPPEN).map(([id, g]) => el('div', { class: 'rk-gruppe' },
      rangEmblem(alsRang(k.gruppen[id]), 34),
      el('span', { class: 'klein' }, g.name),
      el('span', { class: 'leise klein' }, rangText(k.gruppen[id]))))));
}

function vergleich(ich, freund) {
  const zeile = (name, a, b) => el('tr', {},
    el('td', {}, name),
    el('td', { class: a > b ? 'besser' : '' }, String(a)),
    el('td', { class: b > a ? 'besser' : '' }, String(b)));
  const rangWert = (r) => (r ? RAENGE.findIndex((x) => x.id === r.rangId) * 3 + (r.stufe ? 3 - r.stufe : 3) : -1);
  const duell = ich.duell && freund.duell && ich.duell.monat === freund.duell.monat ? el('section', { class: 'karte duell' },
    el('h2', {}, episch(`⚔ Duell im ${monatsName(ich.duell.monat)}`, `Monatsvergleich ${monatsName(ich.duell.monat)}`)),
    el('table', { class: 'tabelle vergleich' },
      el('thead', {}, el('tr', {}, el('th', {}, ''), el('th', {}, 'Du'), el('th', {}, freund.name || 'Freund'))),
      el('tbody', {},
        zeile('Workouts', ich.duell.workouts, freund.duell.workouts),
        zeile('Tonnen bewegt', ich.duell.tonnen, freund.duell.tonnen),
        zeile('Klimmzüge', ich.duell.klimmzuege, freund.duell.klimmzuege),
        zeile('Aktive Tage', ich.duell.aktiveTage, freund.duell.aktiveTage))),
    el('p', { class: 'leise klein' }, `Stand der Karte vom ${freund.datum ?? '?'} – für den aktuellen Stand neue Karten austauschen.`))
    : freund.duell ? el('p', { class: 'leise klein' }, 'Das Monats-Duell erscheint, wenn beide Karten aus demselben Monat sind.') : null;
  return el('div', {}, duell, el('section', { class: 'karte' },
    el('h2', {}, 'Vergleich'),
    el('table', { class: 'tabelle vergleich' },
      el('thead', {}, el('tr', {}, el('th', {}, ''), el('th', {}, 'Du'), el('th', {}, freund.name || 'Freund'))),
      el('tbody', {},
        zeile('Level', ich.level, freund.level),
        ...Object.entries(WERTE).map(([id, w]) => zeile(w.name, ich.werte[id], freund.werte[id])),
        ...Object.entries(GRUPPEN).map(([id, g]) => el('tr', {},
          el('td', {}, g.name),
          el('td', { class: rangWert(ich.gruppen[id]) > rangWert(freund.gruppen[id]) ? 'besser' : '' }, rangText(ich.gruppen[id])),
          el('td', { class: rangWert(freund.gruppen[id]) > rangWert(ich.gruppen[id]) ? 'besser' : '' }, rangText(freund.gruppen[id])))),
        zeile('Erfolge', ich.erfolge, freund.erfolge)))));
}

const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const monatsName = (m) => MONATE[Number(m.slice(5, 7)) - 1] ?? m;

function freundZeile(f, eigene, beiLoeschen) {
  const loeschen = el('div');
  return el('details', { class: 'karte freund' },
    el('summary', { class: 'freund-kopf' },
      rangEmblem(alsRang(f.karte.gesamt), 40),
      el('span', {}, el('strong', {}, f.karte.name || 'Freund'), el('br'),
        el('span', { class: 'leise klein' }, `Lvl ${f.karte.level} · ${rangText(f.karte.gesamt)}`))),
    vergleich(eigene, f.karte),
    el('p', { class: 'leise klein' }, 'Neue Karte vom Freund? Einfach den neuen Link öffnen und speichern – die alte wird ersetzt.'),
    el('button', { class: 'knopf-text gefahr', type: 'button', onclick: () => setze(loeschen, el('button', { class: 'knopf gefahr', type: 'button', onclick: beiLoeschen }, 'Wirklich entfernen')) }, 'Entfernen'),
    loeschen);
}

function teilenBereich(stand) {
  const name = el('input', { type: 'text', value: stand.profil.name ?? '', maxLength: 30, 'aria-label': 'Name auf der Karte', placeholder: 'Name auf der Karte' });
  const status = el('p', { class: 'leise klein', role: 'status' });
  const link = () => `${location.origin}${location.pathname}#/freunde/karte/${kodiereKarte(erstelleKarte(stand, name.value.trim()))}`;
  const teilen = async () => {
    const url = link();
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Meine FORGEBORN-Rangkarte', text: `Lvl ${stand.level.level} – vergleich dich mit mir in FORGEBORN:`, url });
        status.textContent = 'Geteilt.';
      } else {
        await navigator.clipboard.writeText(url);
        status.textContent = 'Link kopiert – jetzt z. B. in WhatsApp einfügen.';
      }
    } catch (f) {
      if (f?.name !== 'AbortError') status.textContent = 'Teilen nicht möglich. Link zum Kopieren: ' + url;
    }
  };
  return el('section', { class: 'karte' },
    el('label', { class: 'feld' }, el('span', {}, 'Name auf der Karte'), name),
    el('div', { class: 'knopfreihe' },
      el('button', { class: 'knopf', type: 'button', onclick: teilen }, icon('teilen', 18), 'Rangkarte teilen')),
    status);
}
