// Ansicht "Mehr": Ziele je Tagestyp, Wochenplan, Backup, Darstellung, Speicher, Über die App.

import { MODI, THEMEN, leseDarstellung, leseThema, setzeDarstellung, setzeThema } from '../darstellung.js';
import { backupDateiname, pruefeBackup } from '../logik/backup.js';
import { coachBericht } from '../logik/coach.js';
import { GESCHLECHTER } from '../logik/referenz.js';
import { WOCHENTAGE, formatKurz, isoDatum, verschiebe } from '../logik/datum.js';
import { APP_NAME, APP_VERSION } from '../logik/schema.js';
import { anteileText, anzahlText, backupText, dabeiSeit, darstellungText, kennzahlen, koerperText, referenzText, wochenplanText, zieleText } from '../logik/zusammenfassung.js';
import { wochenTage } from '../logik/woche.js';
import { RINGE, SLOTS, STANDARD_ANTEILE, STANDARD_ZIELE, TAGESTYPEN, ZIEL_FELDER, bereinigeAnteile, bereinigeRinge, makroAbweichung, pruefeAnteile } from '../logik/ziele.js';
import { parseZahl } from '../logik/zutat.js';
import { erinnerungErlaubnis, gibDatei, hcEinstellungen, hcErlaubt, hcVerbinden, hcVerfuegbar, istApp, planeBenachrichtigungen, setzeVibration, teileText, tippGefuehl, vibrationAn } from '../plattform.js';
import { ALLE_IDS, bereinigeErinnerungen, erinnerungenText, planeErinnerungen } from '../logik/erinnerungen.js';
import { automatischAn, gleicheAb, setzeAutomatisch, zuletztAbgeglichen } from '../abgleich.js';
import { bereinigeWasserMengen } from '../logik/gesundheit.js';
import { HC_ARTEN } from '../logik/healthconnect.js';
import { koerperZielBereich } from './health.js';
import { neuZeichnen } from '../router.js';
import * as speicher from '../speicher.js';
import { FUNKTIONEN, NEUIGKEITEN } from '../daten/neuigkeiten.js';
import { bestaetige, el, gruppe, haenge, hinweis, icon, svg, zahl, zeileFeld, zeileSchalter, zeileWahl, zeilenAuswahl } from '../ui.js';

let gewaehlterTyp = 'gym';

/**
 * Unterseiten von „Mehr“, in Karten. Jede Zeile zeigt statt einer festen Beschreibung den aktuellen Stand
 * (stand(w) bekommt die geladenen Werte). Das Häufigste steht oben.
 */
const MENUE = [
  { eintraege: [
    { id: 'referenz', titel: 'Über dich', stand: (w) => referenzText(w.referenz.gruppe, GESCHLECHTER, w.referenz.daten?.altersgruppen) },
    { id: 'ziele', titel: 'Ziele je Tagestyp', stand: (w) => zieleText(w.ziele) },
    { id: 'koerper', titel: 'Körper und Wasser', stand: (w) => koerperText(w.gesundheit, w.wasserMengen) },
    { id: 'wochenplan', titel: 'Wochenplan', stand: (w) => wochenplanText(w.woche) },
    { id: 'mahlzeiten', titel: 'Anteile der Mahlzeiten', stand: (w) => anteileText(w.anteile) },
  ] },
  { gruppe: 'Lebensmittel', eintraege: [
    { id: 'zutaten', titel: 'Zutaten und Mag-Liste', adresse: '#/zutaten', stand: (w) => anzahlText(w.vorlieben, 'Angabe in der Mag-Liste', 'Angaben in der Mag-Liste', 'Eigene Zutaten und Vorlieben') },
    { id: 'angebote', titel: 'Angebote', adresse: '#/angebote', stand: (w) => anzahlText(w.angebote, 'Angebot', 'Angebote', 'Noch keine Angebote') },
  ] },
  { gruppe: 'Daten und Verbindung', eintraege: [
    { id: 'healthconnect', titel: 'Health Connect', stand: (w) => w.healthConnect },
    { id: 'backup', titel: 'Backup', stand: (w) => backupText(w.letztesBackup, w.heute) },
    { id: 'coach', titel: 'Coach-Export', stand: () => 'Wochenbericht als Text' },
  ] },
  { gruppe: 'App', eintraege: [
    { id: 'erinnerungen', titel: 'Erinnerungen', stand: (w) => (istApp() ? erinnerungenText(w.erinnerungen) : 'Nur in der Android-App') },
    { id: 'darstellung', titel: 'Darstellung', stand: () => darstellungText({ thema: leseThema(), modus: leseDarstellung(), vibration: vibrationAn() }) },
    { id: 'neu', titel: 'Was ist neu', stand: () => NEUIGKEITEN[0]?.titel ?? '' },
    { id: 'ueber', titel: 'Über Elan', stand: () => `Version ${APP_VERSION}` },
  ] },
  { gruppe: 'Rechtliches und Hilfe', eintraege: [
    { id: 'datenschutz', titel: 'Datenschutz', stand: () => 'Was gespeichert wird' },
  ], fuss: 'Elan ist kein Medizinprodukt und ersetzt keinen ärztlichen Rat. Bei Beschwerden oder gesundheitlichen Fragen wende dich an eine Ärztin oder einen Arzt.' },
];

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
    erinnerungen: async () => erinnerungenBereich(),
    ueber: async () => ueberBereich(),
    neu: async () => neuBereich(),
    datenschutz: async () => datenschutzBereich(),
  };
  // Kopf wie in den Einstellungen guter Apps: Zurück als Kasten links, großer Titel daneben
  haenge(wurzel,
    el('header', { class: 'unterkopf' },
      el('a', { class: 'zurueck-kasten', href: '#/mehr', 'aria-label': 'Zurück zu Mehr' }, icon('zurueck', 22)),
      el('h1', {}, eintrag.titel)),
    el('div', { class: 'unterseite' }, await bauen[eintrag.id]()));
}

/** Alle Werte für die Zusammenfassungen in einem Zug laden; Fehler in einer Quelle lassen die Zeile nur leer. */
async function ladeStand() {
  const heute = isoDatum();
  const [eintraege, rezepte, ziele, woche, anteile, referenz, gesundheit, wasserMengen, vorlieben, angebote, letztesBackup, hc, erinnerungen] = await Promise.all([
    speicher.alleEintraege(), speicher.alleRezepte(), speicher.ladeZiele(), speicher.ladeWoche(),
    speicher.einstellung('slotAnteile').then(bereinigeAnteile), speicher.ladeReferenz(), speicher.ladeGesundheit(),
    speicher.einstellung('wasserMengen').then(bereinigeWasserMengen), speicher.alleVorlieben(), speicher.alleAngebote(),
    speicher.einstellung('letztesBackup'), healthConnectStand(), speicher.einstellung('erinnerungen'),
  ]);
  return {
    heute, eintraege, rezepte, ziele, woche, anteile, referenz, gesundheit, wasserMengen, letztesBackup,
    vorlieben: vorlieben.size, angebote: angebote.length, healthConnect: hc, erinnerungen,
  };
}

async function healthConnectStand() {
  if (!istApp()) return 'Nur in der Android-App';
  const erlaubt = await hcErlaubt();
  if (!erlaubt.length) return 'Nicht verbunden';
  const zuletzt = zuletztAbgeglichen();
  return zuletzt ? `Verbunden · abgeglichen ${new Date(zuletzt).toLocaleString('de-DE', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}` : 'Verbunden';
}

async function zeigeMenue(wurzel) {
  document.title = `Mehr – ${APP_NAME}`;
  const w = await ladeStand();
  const seit = dabeiSeit(w.eintraege.map((e) => e.datum));
  const k = kennzahlen(w);
  const kennzahl = (wert, text) => el('div', { class: 'kennzahl' }, el('strong', {}, zahl(wert)), el('span', {}, text));
  haenge(wurzel,
    el('header', { class: 'seitenkopf' }, el('h1', {}, 'Mehr')),
    // Überblick oben: seit wann und wie viel. Ohne Einträge ein freundlicher Start statt Nullen
    el('section', { class: 'menuekarte ueberblick', 'aria-label': 'Überblick' },
      el('h2', { class: 'menuekarte-titel' }, seit ? `Dabei seit ${seit}` : 'Willkommen bei Elan'),
      seit
        ? el('div', { class: 'kennzahlen' }, kennzahl(k.tage, k.tage === 1 ? 'Tag' : 'Tage'), kennzahl(k.eintraege, k.eintraege === 1 ? 'Eintrag' : 'Einträge'), kennzahl(k.rezepte, k.rezepte === 1 ? 'Rezept' : 'Rezepte'))
        : el('p', { class: 'klein' }, 'Sobald du etwas einträgst, siehst du hier, wie viel schon zusammengekommen ist.')),
    MENUE.map((g) => el('section', { class: 'menuekarte', 'aria-label': g.gruppe ?? 'Einstellungen' },
      g.gruppe ? el('h2', { class: 'menuekarte-titel' }, g.gruppe) : null,
      el('ul', { class: 'menue' }, g.eintraege.map((e) => el('li', {},
        el('a', { class: 'menuepunkt', href: e.adresse ?? `#/mehr/${e.id}`, id: `menue-${e.id}` },
          el('span', { class: 'menue-text' }, e.titel, el('small', {}, e.stand(w) || '')),
          icon('vor', 18))))),
      g.fuss ? el('p', { class: 'menuekarte-fuss' }, g.fuss) : null)));
}

/* ---------- Datenschutz: dieselbe Seite, die Health Connect zeigt, hier innerhalb der App ---------- */

async function datenschutzBereich() {
  try {
    const text = await (await fetch('./privacypolicy.html')).text();
    const inhalt = new DOMParser().parseFromString(text, 'text/html').querySelector('main');
    inhalt.querySelector('h1')?.remove(); // Titel steht schon oben
    return el('section', { class: 'bereich datenschutz' }, [...inhalt.childNodes].map((k) => document.importNode(k, true)));
  } catch {
    return el('p', { class: 'fehlertext' }, 'Die Datenschutzseite konnte nicht geladen werden.');
  }
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
  // Zeilen statt Fließtext: Stand oben, die Erklärung klein darunter, Aktionen am Ende
  const wert = (titel, text) => el('div', { class: 'ezeile' }, el('span', { class: 'ezeile-text' }, titel), el('span', { class: 'ezeile-wert klein' }, text));
  return [
    gruppe({
      titel: 'Stand',
      fuss: istApp()
        ? 'Deine Daten liegen nur in dieser App. Deinstallierst du sie oder geht das Handy verloren, sind sie weg. Ein Backup ist eine Datei, die du selbst aufbewahrst.'
        : 'Deine Daten liegen nur in diesem Browser. Löscht der Browser seinen Speicher, sind sie weg. Ein Backup ist eine Datei, die du selbst aufbewahrst.',
    },
    wert('Letztes Backup', letztesBackup ? formatKurz(letztesBackup) : 'noch keins'),
    wert('Einträge', zahl(anzahl.eintraege)),
    wert('Rezepte', zahl(anzahl.rezepte)),
    wert('Körperwerte', zahl(anzahl.messungen))),
    !letztesBackup ? el('p', { class: 'merkzettel' }, 'Du hast noch kein Backup gespeichert.') : null,
    el('div', { class: 'einstell-knoepfe' },
      el('button', { type: 'button', class: 'knopf', onclick: sichern }, 'Backup speichern'),
      el('label', { class: 'textlink', for: 'f-backup-datei' }, 'Backup einspielen'),
      dateiWahl),
    el('p', { class: 'klein backup-alles' }, `Im Backup steckt alles: ${zaehle(anzahl)}.`),
  ];
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
  return el('div', { class: 'einstellungen' },
    el('div', { class: 'wahl', role: 'group', 'aria-label': 'Woche für den Bericht' }, wahl('diese', 'Diese Woche'), wahl('letzte', 'Letzte Woche')),
    el('div', { class: 'egruppe-fuss coach-erklaerung' },
      el('p', {}, 'Ein Wochenbericht als Text: Ernährung, Gewicht, Alltag, Supplements und Symptome. Zum Einfügen in einen Chat mit deinem Coach oder einer KI.'),
      el('p', {}, 'Der Bericht enthält Gesundheitsdaten. Die App sendet ihn nirgendwohin; du entscheidest, wohin du ihn kopierst.')),
    el('div', { class: 'einstell-knoepfe' }, el('button', { type: 'button', class: 'knopf', onclick: erstelle }, 'Bericht erstellen')),
    ausgabe);
}

/* ---------- Darstellung, Speicher, Über ---------- */

/* ---------- Health Connect ---------- */

/**
 * Health Connect ist die Sammelstelle von Android für Gesundheitsdaten (Schrittzähler, Waage, Uhr).
 * Elan liest dort nur Schritte, Gewicht und Schlaf, nur nach deinem Ja, und schreibt nichts zurück.
 */
async function healthConnectBereich() {
  const erklaerung = 'Elan liest nur Schritte, Gewicht, Schlaf, Ruhepuls, Körperfett, HRV und Trainings (für den Tagestyp) der letzten 30 Tage, nichts sonst, und schreibt nichts zurück. Eigene Eingaben in Elan gehen immer vor. Die Daten bleiben auf dem Handy.';
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
      el('a', { class: 'textlink', href: '#/mehr/datenschutz' }, 'Datenschutz')),
  ];
}

/**
 * Erinnerungen für Wasser, Supplements und den Check-in am Abend. Jede Änderung speichert sofort und plant
 * alle Benachrichtigungen neu (einfacher und sicherer als einzelne nachzuziehen). Android erinnert auf ein paar
 * Minuten genau; das reicht und spart die Sonderfreigabe für exakte Wecker.
 */
async function erinnerungenBereich() {
  const fuss = 'Android erinnert dich zur eingestellten Uhrzeit, auf ein paar Minuten genau. Die Erinnerung weiß nicht, ob du schon getrunken hast; sie fragt nur nach.';
  if (!istApp()) {
    return gruppe({ fuss: 'Erinnerungen plant Android auf dem Handy. Im Browser gibt es sie nicht.' },
      el('div', { class: 'ezeile' }, el('span', { class: 'ezeile-text' }, 'Nur in der Android-App')));
  }
  const [gespeichert, erlaubnis] = await Promise.all([speicher.einstellung('erinnerungen'), erinnerungErlaubnis()]);
  let e = bereinigeErinnerungen(gespeichert);
  const sichere = async (neu, zeichne = false) => {
    e = bereinigeErinnerungen(neu);
    const ergebnis = await planeBenachrichtigungen(planeErinnerungen(e), ALLE_IDS);
    if (ergebnis === 'verweigert') {
      // Ohne Erlaubnis nichts als „an“ speichern, sonst zeigt die App Erinnerungen, die nie kommen
      e = bereinigeErinnerungen({ ...e, wasser: { ...e.wasser, an: false }, supplements: { ...e.supplements, an: false }, checkin: { ...e.checkin, an: false } });
      zeichne = true;
    }
    await speicher.setzeEinstellung('erinnerungen', e);
    if (ergebnis === 'verweigert') hinweis('Benachrichtigungen sind für Elan aus. Erlauben in den Android-Einstellungen: Apps → Elan → Benachrichtigungen.');
    if (zeichne) neuZeichnen(); else if (ergebnis === 'ok') tippGefuehl();
  };
  // Auswahl in halben Stunden statt Uhrzeitfeld: zeigt immer 24 Stunden (das Zeitfeld folgt sonst der Systemsprache
  // und schneidet „AM/PM“ ab) und ist mit einem Tipp gewählt. Eine krumme Zeit aus einem Backup bleibt wählbar.
  const zeiten = Array.from({ length: 38 }, (_, i) => `${String(5 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);
  const zeileZeit = ({ id, beschriftung, wert, onchange, entfernen = null }) => el('div', { class: 'ezeile' },
    el('label', { for: id, class: 'ezeile-text' }, beschriftung),
    el('span', { class: 'ezeile-wert wahlfeld zeitwahl' },
      el('select', { id, onchange }, [...new Set([...zeiten, wert])].sort().map((z) => el('option', { value: z, selected: z === wert ? true : null }, z))),
      icon('vor', 16)),
    entfernen);
  const schalter = (id, beschriftung, text) => zeileSchalter({
    id: `f-erinnerung-${id}`, beschriftung, text, an: e[id].an,
    onchange: (ev) => sichere({ ...e, [id]: { ...e[id], an: ev.target.checked } }, true),
  });
  const naechsteZeit = () => {
    const letzte = e.wasser.zeiten.at(-1) ?? '08:00';
    const stunde = Math.min(22, Number(letzte.slice(0, 2)) + 2);
    const vorschlag = `${String(stunde).padStart(2, '0')}:00`;
    return e.wasser.zeiten.includes(vorschlag) ? '07:00' : vorschlag;
  };
  return [
    erlaubnis === 'denied' ? gruppe({ fuss: 'Elan darf gerade keine Benachrichtigungen zeigen. Erlauben in den Android-Einstellungen: Apps → Elan → Benachrichtigungen.' },
      el('div', { class: 'ezeile' }, el('span', { class: 'ezeile-text' }, 'Benachrichtigungen aus'))) : null,
    gruppe({ titel: 'Wasser', fuss: e.wasser.an ? 'Bis zu sechs Uhrzeiten am Tag.' : null },
      schalter('wasser', 'Ans Trinken erinnern', 'Mehrmals am Tag'),
      e.wasser.an ? e.wasser.zeiten.map((zeit, i) => zeileZeit({
        id: `f-wasser-zeit-${i}`, beschriftung: `Erinnerung ${i + 1}`, wert: zeit,
        onchange: (ev) => sichere({ ...e, wasser: { ...e.wasser, zeiten: e.wasser.zeiten.map((z, j) => (j === i ? ev.target.value : z)) } }, true),
        entfernen: e.wasser.zeiten.length > 1 ? el('button', {
          type: 'button', class: 'rund', 'aria-label': `Erinnerung ${i + 1} entfernen`,
          onclick: () => sichere({ ...e, wasser: { ...e.wasser, zeiten: e.wasser.zeiten.filter((_, j) => j !== i) } }, true),
        }, icon('zu', 18)) : null,
      })) : null,
      e.wasser.an && e.wasser.zeiten.length < 6 ? el('button', {
        type: 'button', class: 'ezeile ezeile-knopf', id: 'wasser-zeit-dazu',
        onclick: () => sichere({ ...e, wasser: { ...e.wasser, zeiten: [...e.wasser.zeiten, naechsteZeit()] } }, true),
      }, el('span', { class: 'ezeile-text' }, 'Uhrzeit dazu'), icon('plus', 18)) : null),
    gruppe({ titel: 'Supplements' },
      schalter('supplements', 'An Supplements erinnern', 'Einmal am Tag'),
      e.supplements.an ? zeileZeit({ id: 'f-supplements-zeit', beschriftung: 'Uhrzeit', wert: e.supplements.zeit, onchange: (ev) => sichere({ ...e, supplements: { ...e.supplements, zeit: ev.target.value } }) }) : null),
    gruppe({ titel: 'Check-in', fuss },
      schalter('checkin', 'Abends nachfragen', 'Energie, Stimmung, Stress'),
      e.checkin.an ? zeileZeit({ id: 'f-checkin-zeit', beschriftung: 'Uhrzeit', wert: e.checkin.zeit, onchange: (ev) => sichere({ ...e, checkin: { ...e.checkin, zeit: ev.target.value } }) }) : null),
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
  const schuetzen = async () => {
    const ok = await speicher.sichereSpeicher();
    hinweis(ok ? 'Der Speicher ist jetzt geschützt.' : 'Der Browser hat abgelehnt. Installiere die App auf dem Startbildschirm und versuche es erneut.');
    neuZeichnen();
  };
  return [
    gruppe({ titel: 'Speicher', fuss: status.dauerhaft ? 'Der Browser räumt die Daten dieser App nicht von selbst auf.' : 'Bei knappem Speicherplatz darf der Browser die Daten dieser App löschen.' },
      el('div', { class: 'ezeile' }, el('span', { class: 'ezeile-text' }, 'Geschützt'), el('span', { class: 'ezeile-wert klein' }, status.dauerhaft ? 'ja' : 'nein')),
      status.belegt !== null ? el('div', { class: 'ezeile' }, el('span', { class: 'ezeile-text' }, 'Belegt'), el('span', { class: 'ezeile-wert klein' }, `${zahl(status.belegt / 1024 / 1024, 1)} MB`)) : null),
    status.dauerhaft ? null : el('div', { class: 'einstell-knoepfe' }, el('button', { type: 'button', class: 'knopf leise', onclick: schuetzen }, 'Speicher schützen')),
  ];
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
