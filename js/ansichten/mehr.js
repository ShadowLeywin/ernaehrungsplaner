// Ansicht "Mehr": Ziele je Tagestyp, Wochenplan, Backup, Darstellung, Speicher, Über die App.

import { MODI, leseDarstellung, setzeDarstellung } from '../darstellung.js';
import { backupDateiname, pruefeBackup } from '../logik/backup.js';
import { WOCHENTAGE, formatKurz, isoDatum } from '../logik/datum.js';
import { APP_NAME, APP_VERSION } from '../logik/schema.js';
import { SLOTS, STANDARD_ANTEILE, STANDARD_ZIELE, TAGESTYPEN, ZIEL_FELDER, bereinigeAnteile, makroAbweichung, pruefeAnteile } from '../logik/ziele.js';
import { parseZahl } from '../logik/zutat.js';
import { neuZeichnen } from '../router.js';
import * as speicher from '../speicher.js';
import { bestaetige, el, feld, haenge, hinweis, zahl } from '../ui.js';

let gewaehlterTyp = 'gym';

export async function zeigeMehr(wurzel) {
  document.title = `Mehr – ${APP_NAME}`;
  const [ziele, woche, letztesBackup, status, daten, anteile] = await Promise.all([
    speicher.ladeZiele(), speicher.ladeWoche(), speicher.einstellung('letztesBackup'), speicher.speicherStatus(), speicher.exportiere(),
    speicher.einstellung('slotAnteile'),
  ]);
  haenge(wurzel, 
    el('header', { class: 'seitenkopf' }, el('h1', {}, 'Mehr')),
    zielBereich(ziele),
    wochenBereich(woche),
    anteileBereich(bereinigeAnteile(anteile)),
    backupBereich(letztesBackup, daten.daten),
    darstellungBereich(),
    speicherBereich(status),
    ueberBereich());
}

/* ---------- Ziele ---------- */

function zielBereich(ziele) {
  const bereich = el('section', { class: 'bereich' });
  // Eingaben als Text halten, damit halb getippte Zahlen ("12,") nicht verloren gehen
  const eingabe = Object.fromEntries(TAGESTYPEN.map((t) => [t.id,
    Object.fromEntries(ZIEL_FELDER.map((f) => [f.id, String(ziele[t.id][f.id]).replace('.', ',')]))]));

  const lies = (typ) => {
    const werte = {};
    const fehler = {};
    for (const f of ZIEL_FELDER) {
      const wert = parseZahl(eingabe[typ][f.id]);
      if (wert === null || Number.isNaN(wert) || wert < 0 || wert > f.max) fehler[f.id] = `Zahl von 0 bis ${zahl(f.max)}.`;
      else werte[f.id] = wert;
    }
    return { werte, fehler };
  };

  const zeichne = (zeigeFehler = false) => {
    const typ = gewaehlterTyp;
    const { werte, fehler } = lies(typ);
    const vollstaendig = Object.keys(fehler).length === 0;
    const pruefung = vollstaendig ? makroAbweichung(werte) : null;
    let bilanz = null;
    if (pruefung) {
      const diff = Math.round(pruefung.abweichung);
      bilanz = Math.abs(diff) <= 50
        ? el('p', { class: 'klein' }, `Eiweiß, Kohlenhydrate und Fett ergeben ${zahl(pruefung.ausMakros)} kcal. Das passt zum Energieziel.`)
        : el('p', { class: 'merkzettel' }, `Eiweiß, Kohlenhydrate und Fett ergeben ${zahl(pruefung.ausMakros)} kcal. Das sind ${zahl(Math.abs(diff))} kcal ${diff > 0 ? 'mehr' : 'weniger'} als dein Energieziel.`);
    }

    const speichern = async (e) => {
      e.preventDefault();
      const neu = {};
      for (const t of TAGESTYPEN) {
        const ergebnis = lies(t.id);
        if (Object.keys(ergebnis.fehler).length) { gewaehlterTyp = t.id; zeichne(true); return; }
        neu[t.id] = ergebnis.werte;
      }
      await speicher.setzeEinstellung('ziele', neu);
      hinweis('Ziele gespeichert.');
    };

    bereich.replaceChildren(
      el('h2', {}, 'Ziele je Tagestyp'),
      el('p', { class: 'klein' }, 'Der Tagestyp bestimmt, welches Ziel im Tagebuch gilt.'),
      el('div', { class: 'wahl', role: 'group', 'aria-label': 'Tagestyp' }, TAGESTYPEN.map((t) => el('button', {
        type: 'button', class: 'wahl-knopf', 'aria-pressed': String(t.id === typ), onclick: () => { gewaehlterTyp = t.id; zeichne(); },
      }, t.name))),
      el('form', { class: 'stapel', novalidate: true, onsubmit: speichern },
        el('div', { class: 'raster' }, ZIEL_FELDER.map((f) => feld({
          name: `ziel-${f.id}`, beschriftung: f.name, einheit: f.einheit, inputmode: 'decimal', value: eingabe[typ][f.id],
          fehler: zeigeFehler ? fehler[f.id] : null,
          oninput: (e) => { eingabe[typ][f.id] = e.target.value; },
          onchange: () => zeichne(zeigeFehler),
        }))),
        bilanz,
        el('div', { class: 'knopfreihe' },
          el('button', { type: 'button', class: 'knopf leise', onclick: () => {
            for (const f of ZIEL_FELDER) eingabe[typ][f.id] = String(STANDARD_ZIELE[typ][f.id]);
            zeichne();
          } }, 'Startwerte einsetzen'),
          el('button', { type: 'submit', class: 'knopf' }, 'Ziele speichern'))));
  };
  zeichne();
  return bereich;
}

/* ---------- Wochenplan ---------- */

function wochenBereich(woche) {
  const aktuell = [...woche];
  return el('section', { class: 'bereich' },
    el('h2', {}, 'Wochenplan'),
    el('p', { class: 'klein' }, 'Welcher Tagestyp gilt an welchem Wochentag? Im Tagebuch kannst du einzelne Tage abweichend setzen.'),
    el('div', { class: 'wochenplan' }, WOCHENTAGE.map((tag, i) => el('div', { class: 'feld quer' },
      el('label', { for: `f-woche-${i}` }, tag),
      el('select', { id: `f-woche-${i}`, onchange: async (e) => {
        aktuell[i] = e.target.value;
        await speicher.setzeEinstellung('woche', aktuell);
        hinweis(`${tag}: ${TAGESTYPEN.find((t) => t.id === aktuell[i]).name}.`);
      } }, TAGESTYPEN.map((t) => el('option', { value: t.id, selected: t.id === aktuell[i] }, t.name)))))));
}

/* ---------- Anteile der Mahlzeiten ---------- */

function anteileBereich(anteile) {
  const eingabe = Object.fromEntries(SLOTS.map((s) => [s.id, String(anteile[s.id]).replace('.', ',')]));
  const stand = el('p', { class: 'klein', id: 'anteile-stand', 'aria-live': 'polite' });
  const zeigeStand = () => {
    const p = pruefeAnteile(eingabe);
    stand.textContent = p.ok ? 'Zusammen 100 %.' : p.fehler;
    stand.className = p.ok ? 'klein' : 'fehlertext';
  };
  const felder = el('div', { class: 'raster' });
  const zeichneFelder = () => felder.replaceChildren(...SLOTS.map((s) => feld({
    name: `anteil-${s.id}`, beschriftung: s.name, einheit: '%', inputmode: 'decimal', value: eingabe[s.id],
    oninput: (e) => { eingabe[s.id] = e.target.value; zeigeStand(); },
  })));
  const speichern = async (e) => {
    e.preventDefault();
    const p = pruefeAnteile(eingabe);
    if (!p.ok) { zeigeStand(); stand.scrollIntoView({ block: 'center' }); return; }
    await speicher.setzeEinstellung('slotAnteile', p.anteile);
    hinweis('Anteile gespeichert.');
  };
  zeichneFelder();
  zeigeStand();
  return el('section', { class: 'bereich' },
    el('h2', {}, 'Anteile der Mahlzeiten'),
    el('p', { class: 'klein' }, 'Wie viel vom Tagesziel soll auf welche Mahlzeit entfallen? Das bestimmt die Segmente der Tagesscheibe. Eine Mahlzeit mit 0 % bekommt kein Segment.'),
    el('form', { class: 'stapel', novalidate: true, onsubmit: speichern },
      felder,
      stand,
      el('div', { class: 'knopfreihe' },
        el('button', { type: 'button', class: 'knopf leise', onclick: () => {
          for (const s of SLOTS) eingabe[s.id] = String(STANDARD_ANTEILE[s.id]);
          zeichneFelder();
          zeigeStand();
        } }, 'Startwerte einsetzen'),
        el('button', { type: 'submit', class: 'knopf' }, 'Anteile speichern'))));
}

/* ---------- Backup ---------- */

const BEREICHE = { eintraege: 'Einträge im Tagebuch', plan: 'geplante Mahlzeiten', rezepte: 'Rezepte', zutaten: 'eigene Zutaten', tage: 'abweichende Tagestypen', einstellungen: 'Einstellungen' };
const zaehle = (anzahl) => Object.entries(BEREICHE).map(([id, name]) => `${name}: ${zahl(anzahl[id] ?? 0)}`).join(', ');

function backupBereich(letztesBackup, daten) {
  const anzahl = Object.fromEntries(Object.keys(BEREICHE).map((id) => [id, daten[id]?.length ?? 0]));

  const sichern = async () => {
    const backup = await speicher.exportiere();
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 1)], { type: 'application/json' }));
    const link = el('a', { href: url, download: backupDateiname() });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    await speicher.setzeEinstellung('letztesBackup', isoDatum());
    hinweis('Backup gespeichert. Lege die Datei außerhalb des Handys ab.');
    neuZeichnen();
  };

  const einspielen = async (e) => {
    const datei = e.target.files?.[0];
    e.target.value = '';
    if (!datei) return;
    let pruefung;
    try {
      pruefung = pruefeBackup(JSON.parse(await datei.text()));
    } catch {
      pruefung = { ok: false, fehler: ['Die Datei ist kein gültiges JSON.'] };
    }
    if (!pruefung.ok) {
      await bestaetige({ titel: 'Backup nicht lesbar', text: pruefung.fehler.join(' '), ja: 'Verstanden', nein: 'Schließen' });
      return;
    }
    const vom = pruefung.erstelltAm ? ` vom ${formatKurz(pruefung.erstelltAm.slice(0, 10))}` : '';
    const ja = await bestaetige({
      titel: 'Backup einspielen?', ja: 'Alles ersetzen', gefaehrlich: true,
      text: `Das ersetzt alle Daten auf diesem Gerät durch das Backup${vom}: ${zaehle(pruefung.anzahl)}.`,
    });
    if (!ja) return;
    await speicher.importiere(pruefung.daten);
    hinweis('Backup eingespielt.');
    neuZeichnen();
  };

  const dateiWahl = el('input', { type: 'file', accept: 'application/json,.json', class: 'unsichtbar', id: 'f-backup-datei', onchange: einspielen });
  return el('section', { class: 'bereich' },
    el('h2', {}, 'Backup'),
    el('p', {}, 'Deine Daten liegen nur in diesem Browser. Löscht der Browser seinen Speicher, sind sie weg. Ein Backup ist eine Datei, die du selbst aufbewahrst.'),
    el('p', { class: 'klein' }, `Auf diesem Gerät: ${zaehle(anzahl)}.`),
    el('p', { class: letztesBackup ? 'klein' : 'merkzettel' }, letztesBackup ? `Letztes Backup: ${formatKurz(letztesBackup)}.` : 'Du hast noch kein Backup gespeichert.'),
    el('div', { class: 'knopfreihe' },
      el('label', { class: 'knopf leise', for: 'f-backup-datei' }, 'Backup einspielen'),
      dateiWahl,
      el('button', { type: 'button', class: 'knopf', onclick: sichern }, 'Backup speichern')));
}

/* ---------- Darstellung, Speicher, Über ---------- */

function darstellungBereich() {
  const aktuell = leseDarstellung();
  return el('section', { class: 'bereich' },
    el('h2', {}, 'Darstellung'),
    el('div', { class: 'wahl', role: 'group', 'aria-label': 'Darstellung' }, MODI.map((m) => el('button', {
      type: 'button', class: 'wahl-knopf', 'aria-pressed': String(m.id === aktuell),
      onclick: () => { setzeDarstellung(m.id); neuZeichnen(); },
    }, m.name))));
}

function speicherBereich(status) {
  if (!status.bekannt) return null;
  const belegt = status.belegt === null ? '' : ` Belegt sind ${zahl(status.belegt / 1024 / 1024, 1)} MB.`;
  const schuetzen = async () => {
    const ok = await speicher.sichereSpeicher();
    hinweis(ok ? 'Der Speicher ist jetzt geschützt.' : 'Der Browser hat abgelehnt. Installiere die App auf dem Startbildschirm und versuche es erneut.');
    neuZeichnen();
  };
  return el('section', { class: 'bereich' },
    el('h2', {}, 'Speicher'),
    status.dauerhaft
      ? el('p', {}, `Der Browser räumt die Daten dieser App nicht von selbst auf.${belegt}`)
      : el('p', {}, `Bei knappem Speicherplatz darf der Browser die Daten dieser App löschen.${belegt}`),
    status.dauerhaft ? null : el('div', { class: 'knopfreihe' }, el('button', { type: 'button', class: 'knopf leise', onclick: schuetzen }, 'Speicher schützen')));
}

function ueberBereich() {
  return el('section', { class: 'bereich' },
    el('h2', {}, `Über ${APP_NAME}`),
    el('p', {}, `Version ${APP_VERSION}. Kein Konto, kein Server, keine Auswertung deiner Nutzung.`),
    el('p', { class: 'klein' }, 'Ins Internet geht nur, was du selbst auslöst: ein Suchbegriff oder Barcode an Open Food Facts.'),
    el('p', { class: 'klein' }, 'Nährwerte der mitgelieferten Zutaten: USDA FoodData Central (SR Legacy, gemeinfrei). Online-Suche: Open Food Facts (Open Database License). Die Angaben dienen der Orientierung und ersetzen keine ärztliche Beratung.'));
}
