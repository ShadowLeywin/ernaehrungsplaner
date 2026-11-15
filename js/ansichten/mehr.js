// Ansicht "Mehr": Ziele je Tagestyp, Wochenplan, Backup, Darstellung, Speicher, Über die App.

import { MODI, THEMEN, leseDarstellung, leseThema, setzeDarstellung, setzeThema } from '../darstellung.js';
import { backupDateiname, pruefeBackup } from '../logik/backup.js';
import { coachBericht } from '../logik/coach.js';
import { GESCHLECHTER } from '../logik/referenz.js';
import { WOCHENTAGE, formatKurz, isoDatum, verschiebe } from '../logik/datum.js';
import { APP_NAME, APP_VERSION } from '../logik/schema.js';
import { wochenTage } from '../logik/woche.js';
import { RINGE, SLOTS, STANDARD_ANTEILE, STANDARD_ZIELE, TAGESTYPEN, ZIEL_FELDER, bereinigeAnteile, bereinigeRinge, makroAbweichung, pruefeAnteile } from '../logik/ziele.js';
import { parseZahl } from '../logik/zutat.js';
import { gibDatei, hcEinstellungen, hcErlaubt, hcVerbinden, hcVerfuegbar, istApp, setzeVibration, teileText, tippGefuehl, vibrationAn } from '../plattform.js';
import { automatischAn, gleicheAb, setzeAutomatisch, zuletztAbgeglichen } from '../abgleich.js';
import { bereinigeWasserMengen } from '../logik/gesundheit.js';
import { HC_ARTEN } from '../logik/healthconnect.js';
import { koerperZielBereich } from './health.js';
import { neuZeichnen } from '../router.js';
import * as speicher from '../speicher.js';
import { FUNKTIONEN, NEUIGKEITEN } from '../daten/neuigkeiten.js';
import { bestaetige, el, gruppe, haenge, hinweis, icon, svg, zahl, zeileFeld, zeileSchalter, zeileWahl, zeilenAuswahl } from '../ui.js';

let gewaehlterTyp = 'gym';

/** Unterseiten von „Mehr“, in Gruppen. Das Häufigste steht oben. */
const MENUE = [
  { gruppe: 'Ziele und Tagebuch', eintraege: [
    { id: 'ziele', farbe: '#ff3b30', titel: 'Ziele je Tagestyp', text: 'Energie und Makros für Gym, Calisthenics, Rest', icon: 'ziel' },
    { id: 'koerper', farbe: '#34c759', titel: 'Ziele für Körper und Wasser', text: 'Gewicht je Woche, Wasser, Schlaf, Schritte, Wasser-Knöpfe', icon: 'waage' },
    { id: 'wochenplan', farbe: '#ff9500', titel: 'Wochenplan', text: 'Welcher Wochentag welcher Tagestyp ist', icon: 'kalender' },
    { id: 'mahlzeiten', farbe: '#ff2d55', titel: 'Anteile der Mahlzeiten', text: 'Wie sich das Tagesziel auf sechs Mahlzeiten verteilt', icon: 'scheibe' },
    { id: 'referenz', farbe: '#5856d6', titel: 'Referenzwerte', text: 'Geschlecht und Alter für den Vergleich mit der DGE', icon: 'waage' },
  ] },
  { gruppe: 'Lebensmittel', eintraege: [
    { id: 'zutaten', farbe: '#34c759', titel: 'Zutaten und Mag-Liste', text: 'Eigene Zutaten, Open Food Facts, Vorlieben', icon: 'zutaten', adresse: '#/zutaten' },
    { id: 'angebote', farbe: '#30b0c7', titel: 'Angebote', text: 'Preise je Zutat und Markt', icon: 'preis', adresse: '#/angebote' },
  ] },
  { gruppe: 'Daten', eintraege: [
    { id: 'backup', farbe: '#007aff', titel: 'Backup', text: 'Alle Daten als Datei sichern und einspielen', icon: 'sicherung' },
    { id: 'coach', farbe: '#af52de', titel: 'Coach-Export', text: 'Wochenbericht als Text für einen Chat', icon: 'bericht' },
    { id: 'healthconnect', farbe: '#ff2d55', titel: 'Health Connect', text: 'Schritte, Gewicht und Schlaf vom Handy übernehmen', icon: 'herz' },
  ] },
  { gruppe: 'App', eintraege: [
    { id: 'darstellung', farbe: '#8e8e93', titel: 'Darstellung', text: 'Blatt oder Zitrus, dunkel oder hell, Vibration', icon: 'darstellung' },
    { id: 'ueber', farbe: '#007aff', titel: 'Über Elan', text: 'Alle Funktionen in Kürze, Datenschutz, Quellen', icon: 'info' },
    { id: 'neu', farbe: '#ff9500', titel: 'Was ist neu', text: 'Patchnotes', icon: 'neu' },
  ] },
];

const MENUE_ICONS = {
  ziel: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
  kalender: 'M5 6h14v13H5zM5 10h14M9 4v4M15 4v4',
  scheibe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9',
  waage: 'M12 4v16M6 20h12M5 8h14M5 8l-2.5 6a3 3 0 0 0 5 0zM19 8l-2.5 6a3 3 0 0 0 5 0z',
  zutaten: 'M5 19c0-8 5-14 14-14 0 9-6 14-14 14zM5 19l8-8',
  preis: 'M3 12l9-9h8v8l-9 9zM16 7.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1z',
  sicherung: 'M12 4v11M7 10l5 5 5-5M5 19h14',
  bericht: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5',
  darstellung: 'M12 3a9 9 0 1 0 0 18zM12 3a9 9 0 0 1 0 18',
  herz: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7.5v.5',
  neu: 'M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z',
};

const menueIcon = (name) => svg('svg', { viewBox: '0 0 24 24', width: 22, height: 22, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, svg('path', { d: MENUE_ICONS[name] }));

export async function zeigeMehr(wurzel, [unterseite]) {
  const eintrag = MENUE.flatMap((g) => g.eintraege).find((e) => e.id === unterseite && !e.adresse);
  if (!eintrag) return zeigeMenue(wurzel);
  document.title = `${eintrag.titel} – ${APP_NAME}`;
  const bauen = {
    ziele: async () => [zielBereich(await speicher.ladeZiele()), ringeBereich(bereinigeRinge(await speicher.einstellung('ringe')))],
    wochenplan: async () => wochenBereich(await speicher.ladeWoche()),
    mahlzeiten: async () => anteileBereich(bereinigeAnteile(await speicher.einstellung('slotAnteile'))),
    referenz: async () => referenzBereich(await speicher.ladeReferenz()),
    backup: async () => {
      const [letztesBackup, daten, status] = await Promise.all([speicher.einstellung('letztesBackup'), speicher.exportiere(), speicher.speicherStatus()]);
      return [backupBereich(letztesBackup, daten.daten), istApp() ? null : speicherBereich(status)];
    },
    coach: async () => coachBereich(),
    darstellung: async () => darstellungBereich(),
    koerper: async () => koerperZielBereich(await speicher.ladeGesundheit(), bereinigeWasserMengen(await speicher.einstellung('wasserMengen'))),
    healthconnect: async () => healthConnectBereich(),
    ueber: async () => ueberBereich(),
    neu: async () => neuBereich(),
  };
  haenge(wurzel,
    el('a', { class: 'zurueck', href: '#/mehr' }, icon('zurueck', 18), 'Mehr'),
    el('header', { class: 'seitenkopf' }, el('h1', {}, eintrag.titel)),
    el('div', { class: 'unterseite' }, await bauen[eintrag.id]()));
}

function zeigeMenue(wurzel) {
  document.title = `Mehr – ${APP_NAME}`;
  haenge(wurzel,
    el('header', { class: 'seitenkopf' }, el('h1', {}, 'Mehr')),
    MENUE.map((g) => el('section', { class: 'menuegruppe', 'aria-label': g.gruppe },
      el('h2', { class: 'menuegruppe-titel' }, g.gruppe),
      el('ul', { class: 'menue' }, g.eintraege.map((e) => el('li', {},
        el('a', { class: 'menuepunkt', href: e.adresse ?? `#/mehr/${e.id}` },
          el('span', { class: 'menue-icon', style: `--icon:${e.farbe}` }, menueIcon(e.icon)),
          el('span', { class: 'menue-text' }, e.titel, el('small', {}, e.text)),
          icon('vor', 18))))))),
    el('p', { class: 'klein fusszeile' }, `${APP_NAME} ${APP_VERSION}`));
}

/* ---------- Ringe auf „Heute“ ---------- */

/** Welche Kacheln „Heute“ zeigt. Schalter speichern sofort und ändern sich an Ort und Stelle. */
function ringeBereich(gewaehlt) {
  const an = new Set(gewaehlt);
  return gruppe({ titel: 'Ringe auf „Heute“', fuss: 'Ausgeblendete Werte zählen trotzdem weiter.' },
    RINGE.map((r) => zeileSchalter({
      id: `ring-${r.id}`, beschriftung: r.name, an: an.has(r.id),
      onchange: async (e) => {
        if (e.target.checked) an.add(r.id); else an.delete(r.id);
        await speicher.setzeEinstellung('ringe', RINGE.map((x) => x.id).filter((id) => an.has(id)));
        tippGefuehl();
      },
    })));
}

/* ---------- Ziele ---------- */

function zielBereich(ziele) {
  const bereich = el('div', { class: 'einstellungen' });
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
        ? el('p', {}, `Eiweiß, Kohlenhydrate und Fett ergeben ${zahl(pruefung.ausMakros)} kcal. Das passt zum Energieziel.`)
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

    const name = TAGESTYPEN.find((t) => t.id === typ).name;
    bereich.replaceChildren(
      el('div', { class: 'wahl', role: 'group', 'aria-label': 'Tagestyp' }, TAGESTYPEN.map((t) => el('button', {
        type: 'button', class: 'wahl-knopf', 'aria-pressed': String(t.id === typ), onclick: () => { gewaehlterTyp = t.id; zeichne(); },
      }, t.name))),
      el('form', { novalidate: true, onsubmit: speichern },
        gruppe({ titel: `Ziel an ${name}-Tagen`, fuss: [el('p', {}, 'Der Tagestyp bestimmt, welches Ziel im Tagebuch gilt.'), bilanz] },
          ZIEL_FELDER.map((f) => zeileFeld({
            name: `ziel-${f.id}`, beschriftung: f.name, einheit: f.einheit, inputmode: 'decimal', value: eingabe[typ][f.id],
            fehler: zeigeFehler ? fehler[f.id] : null,
            oninput: (e) => { eingabe[typ][f.id] = e.target.value; },
            onchange: () => zeichne(zeigeFehler),
          }))),
        el('div', { class: 'einstell-knoepfe' },
          el('button', { type: 'submit', class: 'knopf' }, 'Ziele speichern'),
          el('button', { type: 'button', class: 'textlink', onclick: () => {
            for (const f of ZIEL_FELDER) eingabe[typ][f.id] = String(STANDARD_ZIELE[typ][f.id]);
            zeichne();
          } }, 'Startwerte einsetzen'))));
  };
  zeichne();
  return bereich;
}

/* ---------- Wochenplan ---------- */

function wochenBereich(woche) {
  const aktuell = [...woche];
  return gruppe({ fuss: 'Welcher Tagestyp gilt an welchem Wochentag? Im Tagebuch kannst du einzelne Tage abweichend setzen.' },
    WOCHENTAGE.map((tag, i) => zeileWahl({
      id: `f-woche-${i}`, beschriftung: tag, optionen: TAGESTYPEN, wert: aktuell[i],
      onchange: async (e) => {
        aktuell[i] = e.target.value;
        await speicher.setzeEinstellung('woche', aktuell);
        hinweis(`${tag}: ${TAGESTYPEN.find((t) => t.id === aktuell[i]).name}.`);
      },
    })));
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
  const felder = el('div', { class: 'eliste' });
  const zeichneFelder = () => felder.replaceChildren(...SLOTS.map((s) => zeileFeld({
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
  return el('form', { novalidate: true, onsubmit: speichern },
    el('section', { class: 'egruppe', 'aria-label': 'Anteile' },
      felder,
      el('div', { class: 'egruppe-fuss' }, stand,
        el('p', {}, 'Bestimmt die Segmente der Tagesscheibe. Eine Mahlzeit mit 0 % bekommt kein Segment.'))),
    el('div', { class: 'einstell-knoepfe' },
      el('button', { type: 'submit', class: 'knopf' }, 'Anteile speichern'),
      el('button', { type: 'button', class: 'textlink', onclick: () => {
        for (const s of SLOTS) eingabe[s.id] = String(STANDARD_ANTEILE[s.id]);
        zeichneFelder();
        zeigeStand();
      } }, 'Startwerte einsetzen')));
}

/* ---------- Referenzgruppe ---------- */

function referenzBereich({ daten, gruppe: referenzgruppe }) {
  if (!daten) return null;
  const wahl = { geschlecht: referenzgruppe?.geschlecht ?? '', alter: referenzgruppe?.alter ?? '' };
  const speichern = async () => {
    await speicher.setzeEinstellung('referenzgruppe', wahl.geschlecht && wahl.alter ? { ...wahl } : null);
    hinweis(wahl.geschlecht && wahl.alter ? 'Referenzgruppe gespeichert.' : 'Ohne Referenzgruppe gibt es keinen Vergleich.');
  };
  const auswahl = (id, beschriftung, optionen, schluessel) => zeileWahl({
    id, beschriftung, optionen, wert: wahl[schluessel], leer: 'Keine Angabe',
    onchange: (e) => { wahl[schluessel] = e.target.value; speichern(); },
  });
  return gruppe({
    fuss: [
      el('p', {}, `Für Vitamine und Mineralstoffe vergleicht die App mit den Referenzwerten der DGE (Stand ${daten.stand}, abgerufen am ${formatKurz(daten.abgerufen)}). Sie hängen von Geschlecht und Alter ab. Die Angabe bleibt auf dem Gerät.`),
      el('p', {}, 'Für Schwangere und Stillende gelten andere Werte; die zeigt die App nicht.'),
    ],
  },
  auswahl('f-ref-geschlecht', 'Geschlecht', GESCHLECHTER, 'geschlecht'),
  auswahl('f-ref-alter', 'Alter', daten.altersgruppen, 'alter'));
}

/* ---------- Backup ---------- */

const BEREICHE = { eintraege: 'Einträge im Tagebuch', plan: 'geplante Mahlzeiten', rezepte: 'Rezepte', zutaten: 'eigene Zutaten', vorlieben: 'Angaben in der Mag-Liste', messungen: 'Körperwerte', supplements: 'Supplements', labor: 'Laborwerte', symptome: 'Symptome', angebote: 'Angebote', tage: 'abweichende Tagestypen', einstellungen: 'Einstellungen' };
const zaehle = (anzahl) => Object.entries(BEREICHE).map(([id, name]) => `${name}: ${zahl(anzahl[id] ?? 0)}`).join(', ');

function backupBereich(letztesBackup, daten) {
  const anzahl = Object.fromEntries(Object.keys(BEREICHE).map((id) => [id, daten[id]?.length ?? 0]));

  const sichern = async () => {
    const backup = await speicher.exportiere();
    const ergebnis = await gibDatei(backupDateiname(), JSON.stringify(backup, null, 1));
    if (ergebnis === 'abgebrochen') { hinweis('Backup nicht abgelegt.'); return; }
    await speicher.setzeEinstellung('letztesBackup', isoDatum());
    hinweis(istApp() ? 'Backup erstellt. Lege die Datei außerhalb des Handys ab, zum Beispiel in Drive.' : 'Backup gespeichert. Lege die Datei außerhalb des Handys ab.');
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
    el('p', {}, istApp()
      ? 'Deine Daten liegen nur in dieser App. Deinstallierst du sie oder geht das Handy verloren, sind sie weg. Ein Backup ist eine Datei, die du selbst aufbewahrst.'
      : 'Deine Daten liegen nur in diesem Browser. Löscht der Browser seinen Speicher, sind sie weg. Ein Backup ist eine Datei, die du selbst aufbewahrst.'),
    el('p', { class: 'klein' }, `Auf diesem Gerät: ${zaehle(anzahl)}.`),
    el('p', { class: letztesBackup ? 'klein' : 'merkzettel' }, letztesBackup ? `Letztes Backup: ${formatKurz(letztesBackup)}.` : 'Du hast noch kein Backup gespeichert.'),
    el('div', { class: 'knopfreihe' },
      el('label', { class: 'knopf leise', for: 'f-backup-datei' }, 'Backup einspielen'),
      dateiWahl,
      el('button', { type: 'button', class: 'knopf', onclick: sichern }, 'Backup speichern')));
}

/* ---------- Coach-Export ---------- */

let coachWoche = 'diese';

function coachBereich() {
  const ausgabe = el('div', { class: 'stapel', id: 'coach-ausgabe' });
  const erstelle = async () => {
    const heute = isoDatum();
    const tage = wochenTage(coachWoche === 'diese' ? heute : verschiebe(heute, -7));
    const stichtag = heute < tage[6] ? heute : tage[6];
    const [eintraege, ziele, wochenplan, messungen, gesundheit, symptome, supplements, saetze] = await Promise.all([
      speicher.eintraegeZwischen(tage[0], tage[6]), speicher.ladeZiele(), speicher.ladeWoche(), speicher.messungenZwischen(verschiebe(tage[0], -14), tage[6]),
      speicher.ladeGesundheit(), speicher.symptomeZwischen(tage[0], tage[6]), speicher.alleSupplements(), Promise.all(tage.map(speicher.holeTag)),
    ]);
    const tagSaetze = new Map(saetze.filter(Boolean).map((t) => [t.datum, t]));
    const text = coachBericht({ tage, stichtag, eintraege, ziele, wochenplan, tagSaetze, messungen, gesundheit, symptome, supplements });
    const kopiere = async () => {
      try { await navigator.clipboard.writeText(text); hinweis('Bericht kopiert.'); } catch { hinweis('Kopieren hat nicht geklappt. Tippe auf „Teilen“ oder markiere den Text von Hand.'); }
    };
    const teile = async () => {
      try { if ((await teileText(text, 'Wochenbericht')) === 'kopiert') hinweis('Bericht kopiert.'); } catch { hinweis('Teilen hat nicht geklappt.'); }
    };
    ausgabe.replaceChildren(
      el('textarea', { id: 'f-coach-text', rows: 14, readonly: true, 'aria-label': 'Wochenbericht' }, text),
      el('div', { class: 'knopfreihe' },
        istApp() || navigator.share ? el('button', { type: 'button', class: 'knopf leise', onclick: teile }, 'Teilen') : null,
        el('button', { type: 'button', class: 'knopf', onclick: kopiere }, 'Bericht kopieren')));
  };
  const wahl = (id, name) => el('button', {
    type: 'button', class: 'wahl-knopf', 'aria-pressed': String(coachWoche === id),
    onclick: (e) => {
      coachWoche = id;
      for (const knopf of e.target.parentElement.children) knopf.setAttribute('aria-pressed', String(knopf === e.target));
      if (ausgabe.childElementCount) erstelle();
    },
  }, name);
  return el('section', { class: 'bereich' },
    el('h2', {}, 'Coach-Export'),
    el('p', {}, 'Ein Wochenbericht als Text: Ernährung, Gewicht, Alltag, Supplements und Symptome. Zum Einfügen in einen Chat mit deinem Coach oder einer KI.'),
    el('p', { class: 'klein' }, 'Der Bericht enthält Gesundheitsdaten. Die App sendet ihn nirgendwohin; du entscheidest, wohin du ihn kopierst.'),
    el('div', { class: 'wahl', role: 'group', 'aria-label': 'Woche für den Bericht' }, wahl('diese', 'Diese Woche'), wahl('letzte', 'Letzte Woche')),
    el('div', { class: 'knopfreihe' }, el('button', { type: 'button', class: 'knopf leise', onclick: erstelle }, 'Bericht erstellen')),
    ausgabe);
}

/* ---------- Darstellung, Speicher, Über ---------- */

/* ---------- Health Connect ---------- */

/**
 * Health Connect ist die Sammelstelle von Android für Gesundheitsdaten (Schrittzähler, Waage, Uhr).
 * Elan liest dort nur Schritte, Gewicht und Schlaf, nur nach deinem Ja, und schreibt nichts zurück.
 */
async function healthConnectBereich() {
  const erklaerung = 'Elan liest nur Schritte, Gewicht und Schlaf der letzten 30 Tage, nichts sonst, und schreibt nichts zurück. Eigene Eingaben in Elan gehen immer vor. Die Daten bleiben auf dem Handy.';
  if (!istApp()) {
    return gruppe({ fuss: [el('p', {}, 'Health Connect gibt es nur in der Android-App.'), el('p', {}, erklaerung)] },
      el('div', { class: 'ezeile' }, el('span', { class: 'ezeile-text' }, 'Im Browser nicht verfügbar')));
  }
  const [stand, erlaubt] = await Promise.all([hcVerfuegbar(), hcErlaubt()]);
  const zuletzt = zuletztAbgeglichen();
  const abgleichen = async () => {
    const anzahl = await gleicheAb();
    hinweis(anzahl ? `${anzahl} ${anzahl === 1 ? 'Wert' : 'Werte'} übernommen.` : 'Alles schon da.');
    neuZeichnen();
  };
  const verbinden = async () => {
    const neu = await hcVerbinden();
    if (neu.length) { tippGefuehl('erfolg'); await abgleichen(); } else hinweis('Keine Erlaubnis erteilt. Du kannst es jederzeit erneut versuchen.');
  };
  if (!stand.verfuegbar) {
    return gruppe({ fuss: [el('p', {}, 'Health Connect ist auf diesem Handy nicht eingerichtet. Ab Android 14 ist es eingebaut, davor gibt es die App „Health Connect“ im Play Store.'), el('p', {}, erklaerung)] },
      el('div', { class: 'ezeile' }, el('span', { class: 'ezeile-text' }, 'Nicht verfügbar')));
  }
  return [
    gruppe({ titel: 'Daten', fuss: erklaerung },
      HC_ARTEN.map((a) => el('div', { class: 'ezeile' },
        el('span', { class: 'ezeile-text' }, a.name),
        el('span', { class: 'ezeile-wert klein' }, erlaubt.includes(a.hc) ? 'erlaubt' : 'nicht erlaubt')))),
    gruppe({ titel: 'Abgleich', fuss: zuletzt ? `Zuletzt: ${new Date(zuletzt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}` : null },
      zeileSchalter({
        id: 'f-hc-automatisch', beschriftung: 'Beim Öffnen abgleichen', text: 'Holt neue Werte, sobald du Elan öffnest', an: automatischAn(),
        onchange: (e) => setzeAutomatisch(e.target.checked),
      })),
    el('div', { class: 'einstell-knoepfe' },
      erlaubt.length
        ? el('button', { type: 'button', class: 'knopf', onclick: abgleichen }, 'Jetzt abgleichen')
        : el('button', { type: 'button', class: 'knopf', onclick: verbinden }, 'Mit Health Connect verbinden'),
      erlaubt.length ? el('button', { type: 'button', class: 'textlink', onclick: verbinden }, 'Erlaubnis ändern') : null,
      el('button', { type: 'button', class: 'textlink', onclick: hcEinstellungen }, 'Health Connect öffnen'),
      el('a', { class: 'textlink', href: './privacypolicy.html' }, 'Datenschutz')),
  ];
}

function darstellungBereich() {
  // Kleine Farbprobe je Design: Grund, Fläche, Akzent
  const probe = (...farben) => el('span', { class: 'vorschau-farben', 'aria-hidden': 'true' }, farben.map((f) => el('span', { style: `background:${f}` })));
  const design = [
    { id: 'blatt', name: 'Blatt', text: 'Schlicht wie auf dem iPhone, in Grün', vorschau: probe('#0b100c', '#172019', '#b5e13a') },
    { id: 'zitrus', name: 'Zitrus', text: 'Das erste Design, mit eigener Schrift', vorschau: probe('#f5f9ec', '#ffffff', '#1c7445') },
  ];
  const neu = (setze) => (id) => { setze(id); neuZeichnen(); };
  return [
    gruppe({ titel: 'Design' }, zeilenAuswahl({ name: 'design', optionen: design, wert: leseThema(), onchange: neu(setzeThema) })),
    gruppe({ titel: 'Hell oder dunkel', fuss: '„Wie das Handy“ folgt der Einstellung des Systems.' },
      zeilenAuswahl({ name: 'modus', optionen: MODI, wert: leseDarstellung(), onchange: neu(setzeDarstellung) })),
    gruppe({ titel: 'Bedienung' }, zeileSchalter({
      id: 'f-vibration', beschriftung: 'Vibration beim Tippen', text: 'Beim Eintragen, bei Wasser und Häkchen', an: vibrationAn(),
      onchange: (e) => { setzeVibration(e.target.checked); if (e.target.checked) tippGefuehl(); },
    })),
  ];
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
  return el('div', { class: 'stapel' },
    el('p', {}, `${APP_NAME} hilft dir, Ernährung und Gesundheitswerte im Blick zu behalten. Version ${APP_VERSION}.`),
    el('ul', { class: 'funktionen' }, FUNKTIONEN.map((f) => el('li', {}, el('h2', {}, f.titel), el('p', {}, f.text)))),
    el('section', { class: 'bereich' },
      el('h2', {}, 'Quellen'),
      el('p', { class: 'klein' }, 'Nährwerte der mitgelieferten Zutaten: USDA FoodData Central (SR Legacy, gemeinfrei). Online-Suche: Open Food Facts (Open Database License). Referenzwerte: Deutsche Gesellschaft für Ernährung (DGE). Schrift: Bricolage Grotesque (SIL Open Font License). Elan selbst steht unter der MIT-Lizenz.'),
      el('p', { class: 'klein' }, 'Die Angaben dienen der Orientierung und ersetzen keine ärztliche Beratung.')),
    el('p', {}, el('a', { class: 'textlink', href: '#/mehr/neu' }, 'Was ist neu')));
}

function neuBereich() {
  return el('ol', { class: 'neuigkeiten' }, NEUIGKEITEN.map((n) => el('li', {},
    el('p', { class: 'neu-kopf' }, el('span', { class: 'marke' }, n.version), ` ${formatKurz(n.datum)}`),
    el('h2', {}, n.titel),
    el('ul', {}, n.punkte.map((p) => el('li', {}, p))))));
}
