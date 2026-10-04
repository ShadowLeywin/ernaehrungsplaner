// Training: Übersicht (heute, letzte Einheiten), laufendes Workout mit Sätzen, Pausentimer und Abschluss,
// Schnelleintrag für Cardio/Sport. Daten im Tagesdatensatz (tag.trainings), siehe js/logic/training.js.
import { el, setze, zahl, schalter } from '../ui.js';
import { icon } from '../icons.js';
import { lese, schreibe, alleEintraege } from '../db.js';
import { holeProfil, holeTag, speichereTag } from '../state.js';
import { datumSchluessel, tagestypFuerDatum } from '../logic/ziele.js';
import { UEBUNGEN, MUSKELN, INTENSITAETEN } from '../daten/uebungen.js';
import {
  uebungsVerzeichnis, kcalTraining, dauerMin, statistik, letzteLeistung, saetzeText, zusatzKcal,
} from '../logic/training.js';
import { holeGewichtsReihe } from './gewicht.js';
import { oeffneUebungDialog } from './uebung-dialog.js';
import { oeffneVorlageEditor } from './vorlage-editor.js';
import { vorlagenFuerTag, erledigteVorlagen, workoutAusVorlage } from '../logic/vorlagen.js';
import { WOCHENTAGE } from '../logic/profil.js';

const verzeichnis = uebungsVerzeichnis(UEBUNGEN);
const datumKurz = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' });
const neueId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const kcalText = (kcal) => `${zahl(Math.round(kcal))} kcal`;

let uhrIntervall = null;
let wachHalten = null;

export const training = {
  titel: 'Training',
  einstellungen: trainingsEinstellungen,
  render() {
    const wurzel = el('div');
    lade(wurzel);
    return wurzel;
  },
};

async function lade(wurzel) {
  const [profil, eintraege, gewichte, aktiv, vorlagen] = await Promise.all([
    holeProfil(), alleEintraege('tage'), holeGewichtsReihe(), lese('einstellungen', 'aktivesTraining'), lese('einstellungen', 'vorlagen'),
  ]);
  const k = {
    wurzel,
    profil,
    vorlagen: vorlagen ?? [],
    alleTage: eintraege.map(([, t]) => t),
    gewichtKg: gewichte.at(-1)?.kg ?? profil.koerper.gewichtKg ?? 75,
    gewichtGeschaetzt: !gewichte.length && !profil.koerper.gewichtKg,
  };
  if (aktiv) {
    const tag = await holeTag(aktiv.datum);
    const laufend = tag.trainings.find((t) => t.id === aktiv.id && !t.ende);
    if (laufend) { zeichneWorkout(k, tag, laufend); return; }
    await schreibe('einstellungen', 'aktivesTraining', null);
  }
  zeichneUebersicht(k, await holeTag(datumSchluessel(new Date())));
}

/** Zählt Training an Tagen ohne geplanten Sport standardmäßig als Zusatz (erhöht das Tagesziel). */
function standardZusatz(profil) {
  return !(tagestypFuerDatum(profil, new Date()).typ.aktivitaeten?.length);
}

function stoppeWorkoutHilfen() {
  clearInterval(uhrIntervall);
  uhrIntervall = null;
  wachHalten?.release?.().catch(() => {});
  wachHalten = null;
  document.querySelector('.pausen-leiste')?.remove();
}

// ---------------------------------------------------------------- Übersicht

function zeichneUebersicht(k, tag) {
  stoppeWorkoutHilfen();
  const fertig = tag.trainings.filter((t) => t.typ === 'aktivitaet' || t.ende);
  const gesamt = fertig.reduce((s, t) => s + kcalTraining(t, verzeichnis, k.gewichtKg), 0);
  const zusatz = zusatzKcal(tag, verzeichnis, k.gewichtKg);
  const frueher = k.alleTage
    .filter((t) => t.datum !== tag.datum)
    .flatMap((t) => (t.trainings ?? []).filter((x) => x.typ === 'aktivitaet' || x.ende).map((x) => ({ datum: t.datum, t: x })))
    .sort((a, b) => b.datum.localeCompare(a.datum) || (b.t.start ?? '').localeCompare(a.t.start ?? ''))
    .slice(0, 12);

  const neuLaden = () => lade(k.wurzel);
  const loesche = async (t) => {
    tag.trainings.splice(tag.trainings.indexOf(t), 1);
    await speichereTag(tag);
    neuLaden();
  };

  setze(k.wurzel,
    el('section', { class: 'karte hero' },
      el('div', { class: 'hero-oben' }, el('h2', {}, 'Heute verbrannt'), el('span', { class: 'marke' }, `${fertig.length} Einheit${fertig.length === 1 ? '' : 'en'}`)),
      el('p', { class: 'grosszahl' }, `≈ ${kcalText(gesamt)}`),
      el('p', { class: 'leise klein' }, zusatz > 0
        ? `davon Zusatz-Training ${kcalText(zusatz)} – dein Tagesziel steigt entsprechend.`
        : 'Geplantes Training steckt schon in deinem Tagesziel. Zusätzliches Training erhöht es.'),
      k.gewichtGeschaetzt
        ? el('p', { class: 'warnung klein' }, 'Kein Gewicht bekannt – gerechnet wird mit 75 kg. Trag dein Gewicht unter „Heute“ ein.')
        : null,
      el('div', { class: 'knopfreihe' },
        el('button', { class: 'knopf', type: 'button', onclick: () => starteWorkout(k) }, icon('hantel', 20), 'Workout starten'),
        el('button', { class: 'knopf zweitrangig', type: 'button', onclick: () => aktivitaetEintragen(k, tag) }, icon('flamme', 20), 'Cardio / Sport'))),
    ...vorlagenBereich(k, tag),
    fertig.length ? el('h2', { class: 'abschnitt' }, 'Heute erledigt') : null,
    ...fertig.map((t) => trainingKarte(t, k.gewichtKg, () => loesche(t))),
    frueher.length ? el('h2', { class: 'abschnitt' }, 'Letzte Einheiten') : null,
    ...frueher.map(({ datum, t }) => trainingKarte(t, k.gewichtKg, null, datum)),
    !fertig.length && !frueher.length
      ? el('p', { class: 'leise klein', style: 'text-align:center;margin-top:24px' }, `${UEBUNGEN.length} Übungen und Aktivitäten warten auf dich.`)
      : null);
}

// ---------------------------------------------------------------- Vorlagen

async function speichereVorlagen(k, vorlagen) {
  await schreibe('einstellungen', 'vorlagen', vorlagen);
  lade(k.wurzel);
}

function bearbeiteVorlage(k, vorlage) {
  const vorhanden = k.vorlagen.some((v) => v.id === vorlage.id);
  oeffneVorlageEditor({
    vorlage,
    verzeichnis,
    beiSpeichern: (neu) => speichereVorlagen(k, vorhanden ? k.vorlagen.map((v) => (v.id === neu.id ? neu : v)) : [...k.vorlagen, neu]),
    beiLoeschen: vorhanden ? () => speichereVorlagen(k, k.vorlagen.filter((v) => v.id !== vorlage.id)) : null,
  });
}

function vorlagenBereich(k, tag) {
  const heute = vorlagenFuerTag(k.vorlagen, new Date());
  const erledigt = erledigteVorlagen(tag);
  const karte = (v, kompakt) => el('div', { class: `vorlage${erledigt.has(v.id) ? ' erledigt' : ''}` },
    el('div', {},
      el('strong', {}, erledigt.has(v.id) ? '✓ ' : '', v.name),
      el('span', { class: 'leise klein' },
        [v.uhrzeit, `${v.uebungen.length} Übung${v.uebungen.length === 1 ? '' : 'en'}`,
          kompakt ? v.tage.map((t) => WOCHENTAGE[t].slice(0, 2)).join(' ') : null].filter(Boolean).join(' · '))),
    el('div', { class: 'vorlage-knoepfe' },
      el('button', { class: 'knopf-klein', type: 'button', 'aria-label': `${v.name} bearbeiten`, onclick: () => bearbeiteVorlage(k, v) }, icon('stift', 18)),
      el('button', { class: `knopf${erledigt.has(v.id) ? ' zweitrangig' : ''}`, type: 'button', onclick: () => starteVorlage(k, v) }, 'Start')));

  return [
    heute.length ? el('h2', { class: 'abschnitt' }, 'Heute geplant') : null,
    heute.length ? el('section', { class: 'karte' }, ...heute.map((v) => karte(v, false))) : null,
    el('details', { class: 'karte vorlagen-liste' },
      el('summary', {}, `Alle Vorlagen (${k.vorlagen.length})`),
      ...k.vorlagen.map((v) => karte(v, true)),
      el('button', {
        class: 'knopf zweitrangig voll', type: 'button',
        onclick: () => bearbeiteVorlage(k, { id: neueId(), name: '', tage: [], uhrzeit: '', uebungen: [] }),
      }, icon('plus', 18), 'Neue Vorlage')),
  ];
}

async function starteVorlage(k, vorlage) {
  const datum = datumSchluessel(new Date());
  const tag = await holeTag(datum);
  const t = workoutAusVorlage(vorlage, k.alleTage, verzeichnis, { id: neueId(), zusatz: standardZusatz(k.profil) });
  tag.trainings.push(t);
  await speichereTag(tag);
  await schreibe('einstellungen', 'aktivesTraining', { datum, id: t.id });
  zeichneWorkout(k, tag, t);
}

function trainingKarte(t, gewichtKg, beiLoeschen, datum = null) {
  const kcal = kcalTraining(t, verzeichnis, gewichtKg);
  const name = t.typ === 'aktivitaet' ? verzeichnis.get(t.uebungId)?.name ?? 'Aktivität' : t.name;
  const st = t.typ === 'workout' ? statistik(t) : null;
  const meta = [
    datum ? datumKurz.format(new Date(`${datum}T12:00:00`)) : null,
    `${dauerMin(t)} min`,
    t.km ? `${zahl(t.km)} km` : null,
    st ? `${st.saetze} Sätze` : null,
    st?.volumen ? `${zahl(st.volumen)} kg bewegt` : null,
    `≈ ${kcalText(kcal)}`,
  ].filter(Boolean).join(' · ');

  const loeschBereich = el('div');
  const zeigeLoeschen = () => setze(loeschBereich, el('div', { class: 'knopfreihe' },
    el('button', { class: 'knopf gefahr', type: 'button', onclick: beiLoeschen }, 'Wirklich löschen'),
    el('button', { class: 'knopf zweitrangig', type: 'button', onclick: () => setze(loeschBereich) }, 'Abbrechen')));

  return el('section', { class: 'karte training-karte' },
    el('div', { class: 'zeile' },
      el('h2', {}, icon(t.typ === 'workout' ? 'hantel' : 'flamme', 20), name),
      t.zusatz ? el('span', { class: 'marke' }, 'Zusatz') : null),
    el('p', { class: 'leise klein' }, meta),
    t.typ === 'workout' && t.uebungen.length ? el('details', {},
      el('summary', {}, `${t.uebungen.length} Übung${t.uebungen.length === 1 ? '' : 'en'}`),
      el('ul', { class: 'liste-einfach klein' }, ...t.uebungen.map((e) => {
        const u = verzeichnis.get(e.uebungId);
        const details = e.cardio
          ? `${e.cardio.min ?? 0} min${e.cardio.km ? ` · ${zahl(e.cardio.km)} km` : ''}`
          : saetzeText(e.saetze.filter((s) => s.erledigt), u?.art) || 'keine Sätze erledigt';
        return el('li', {}, el('strong', {}, u?.name ?? e.uebungId), ` – ${details}`);
      })))
      : null,
    beiLoeschen ? el('button', { class: 'knopf-text', type: 'button', onclick: zeigeLoeschen }, 'Löschen') : null,
    loeschBereich);
}

// ---------------------------------------------------------------- Workout

async function starteWorkout(k) {
  const datum = datumSchluessel(new Date());
  const tag = await holeTag(datum);
  const stunde = new Date().getHours();
  const t = {
    id: neueId(),
    typ: 'workout',
    name: `${stunde < 11 ? 'Morgen' : stunde < 17 ? 'Mittags' : 'Abend'}-Workout`,
    start: new Date().toISOString(),
    ende: null,
    intensitaet: 'mittel',
    zusatz: standardZusatz(k.profil),
    uebungen: [],
  };
  tag.trainings.push(t);
  await speichereTag(tag);
  await schreibe('einstellungen', 'aktivesTraining', { datum, id: t.id });
  zeichneWorkout(k, tag, t);
}

function neuerEintrag(u, alleTage, trainingId) {
  if (u.art === 'cardio' || u.art === 'dauer') return { uebungId: u.id, cardio: { min: 10, km: null } };
  const letzte = letzteLeistung(u.id, alleTage, trainingId);
  const saetze = letzte
    ? letzte.saetze.map((s) => ({ wdh: s.wdh, kg: s.kg, sek: s.sek, erledigt: false }))
    : [{ wdh: u.art === 'halten' ? undefined : 8, kg: u.art === 'kraft' ? 20 : 0, sek: u.art === 'halten' ? 20 : undefined, erledigt: false }];
  return { uebungId: u.id, saetze };
}

function zeichneWorkout(k, tag, t) {
  const speichern = () => speichereTag(tag);
  const neu = () => zeichneWorkout(k, tag, t);

  // Bildschirm während des Trainings anlassen (wenn unterstützt)
  if (!wachHalten && navigator.wakeLock && ladeWachHalten()) {
    navigator.wakeLock.request('screen').then((w) => { wachHalten = w; }).catch(() => {});
  }

  const uhr = el('strong', { class: 'workout-uhr' });
  const kcalLive = el('span', { class: 'leise klein' });
  const aktualisiereUhr = () => {
    const sek = Math.max(0, Math.floor((Date.now() - new Date(t.start)) / 1000));
    const h = Math.floor(sek / 3600);
    const m = String(Math.floor((sek % 3600) / 60)).padStart(2, '0');
    const s = String(sek % 60).padStart(2, '0');
    uhr.textContent = h ? `${h}:${m}:${s}` : `${m}:${s}`;
    kcalLive.textContent = `≈ ${kcalText(kcalTraining(t, verzeichnis, k.gewichtKg))}`;
  };
  clearInterval(uhrIntervall);
  uhrIntervall = setInterval(() => {
    if (!document.body.contains(uhr)) { clearInterval(uhrIntervall); return; }
    aktualisiereUhr();
  }, 1000);
  aktualisiereUhr();

  const name = el('input', {
    type: 'text', value: t.name, 'aria-label': 'Name des Workouts', class: 'workout-name',
    oninput: () => { t.name = name.value; speichern(); },
  });

  setze(k.wurzel,
    el('section', { class: 'karte workout-kopf' },
      name,
      el('div', { class: 'zeile' },
        el('span', { class: 'workout-zeit' }, icon('uhr', 18), uhr),
        kcalLive,
        el('button', { class: 'knopf', type: 'button', onclick: () => oeffneAbschluss(k, tag, t) }, 'Beenden'))),
    ...t.uebungen.map((e) => uebungsKarte(k, t, e, speichern, neu)),
    t.uebungen.length ? null : el('p', { class: 'leise', style: 'text-align:center' }, 'Füge deine erste Übung hinzu.'),
    el('button', {
      class: 'knopf voll', type: 'button',
      onclick: () => oeffneUebungDialog({
        titel: 'Übung hinzufügen',
        beiAuswahl: (u) => { t.uebungen.push(neuerEintrag(u, k.alleTage, t.id)); speichern(); neu(); },
      }),
    }, icon('plus', 18), 'Übung'),
    verwerfenBereich(k, tag, t));
}

function verwerfenBereich(k, tag, t) {
  const bereich = el('div', { style: 'text-align:center;margin-top:18px' });
  const verwerfen = async () => {
    tag.trainings.splice(tag.trainings.indexOf(t), 1);
    await speichereTag(tag);
    await schreibe('einstellungen', 'aktivesTraining', null);
    lade(k.wurzel);
  };
  const zeige = () => setze(bereich, el('button', { class: 'knopf-text gefahr', type: 'button', onclick: frage }, 'Workout verwerfen'));
  const frage = () => setze(bereich, el('div', { class: 'knopfreihe', style: 'justify-content:center' },
    el('button', { class: 'knopf gefahr', type: 'button', onclick: verwerfen }, 'Ja, verwerfen'),
    el('button', { class: 'knopf zweitrangig', type: 'button', onclick: zeige }, 'Abbrechen')));
  zeige();
  return bereich;
}

function uebungsKarte(k, t, eintrag, speichern, neu) {
  const u = verzeichnis.get(eintrag.uebungId) ?? { name: eintrag.uebungId, art: 'kraft', muskeln: [] };
  const entfernen = el('button', {
    class: 'knopf-klein', type: 'button', 'aria-label': `${u.name} entfernen`,
    onclick: () => { t.uebungen.splice(t.uebungen.indexOf(eintrag), 1); speichern(); neu(); },
  }, icon('schliessen', 18));

  const kopf = el('div', { class: 'zeile' }, el('h2', {}, u.name), entfernen);

  if (eintrag.cardio) {
    const feld = (beschriftung, schluessel, einheit) => {
      const eingabe = el('input', {
        type: 'number', inputMode: 'decimal', min: 0, step: 'any', value: eintrag.cardio[schluessel] ?? '',
        oninput: () => { eintrag.cardio[schluessel] = eingabe.value === '' ? null : eingabe.valueAsNumber; speichern(); },
      });
      return el('label', { class: 'feld' }, el('span', {}, `${beschriftung} (${einheit})`), eingabe);
    };
    return el('section', { class: 'karte' }, kopf,
      eintrag.notiz ? el('p', { class: 'leise klein' }, eintrag.notiz) : null,
      el('div', { class: 'felder' }, feld('Dauer', 'min', 'min'), u.distanz ? feld('Distanz', 'km', 'km') : null));
  }

  const letzte = letzteLeistung(u.id, k.alleTage, t.id);
  const tabelle = el('div', { class: 'saetze' });
  const zeichneSaetze = () => setze(tabelle,
    el('div', { class: 'satz-zeile satz-kopf' },
      el('span', {}, 'Satz'),
      u.art === 'halten' ? el('span', {}, 'Sek') : el('span', {}, u.art === 'kraft' ? 'kg' : '+kg'),
      u.art === 'halten' ? el('span', {}) : el('span', {}, 'Wdh'),
      el('span', {})),
    ...eintrag.saetze.map((s, i) => satzZeile(u, s, i, speichern, () => {
      eintrag.saetze.splice(i, 1);
      speichern();
      zeichneSaetze();
    }, ersteZahl(eintrag.ziel))),
  );
  zeichneSaetze();

  return el('section', { class: 'karte' },
    kopf,
    el('p', { class: 'leise klein' },
      u.muskeln.map((m) => MUSKELN[m]).join(', '),
      letzte ? el('span', { class: 'letztes-mal' }, ` · Letztes Mal: ${saetzeText(letzte.saetze, u.art)}`) : null),
    eintrag.ziel || eintrag.notiz
      ? el('p', { class: 'klein' }, eintrag.ziel ? el('strong', {}, `Ziel: ${eintrag.saetze.length} × ${eintrag.ziel}`) : null,
        eintrag.notiz ? ` ${eintrag.notiz}` : null)
      : null,
    tabelle,
    el('button', {
      class: 'knopf zweitrangig voll', type: 'button',
      onclick: () => {
        const vorlage = eintrag.saetze.at(-1) ?? {};
        eintrag.saetze.push({ wdh: vorlage.wdh, kg: vorlage.kg, sek: vorlage.sek, erledigt: false });
        speichern();
        zeichneSaetze();
      },
    }, icon('plus', 18), 'Satz'));
}

/** Untere Grenze aus einem Ziel wie „8–12“ oder „45–60 s“. */
function ersteZahl(text) {
  const treffer = String(text ?? '').match(/\d+/);
  return treffer ? Number(treffer[0]) : undefined;
}

/** Eine Satzzeile. zielWert dient als Platzhalter und wird beim Abhaken eines leeren Felds übernommen. */
function satzZeile(u, s, index, speichern, entfernen, zielWert) {
  const eingaben = {};
  const zahlEingabe = (schluessel, beschriftung, platzhalter) => {
    const eingabe = el('input', {
      type: 'number', inputMode: 'decimal', min: 0, step: 'any', value: s[schluessel] ?? '', 'aria-label': `${beschriftung} Satz ${index + 1}`,
      placeholder: platzhalter ?? '',
      oninput: () => { s[schluessel] = eingabe.value === '' ? undefined : eingabe.valueAsNumber; speichern(); },
    });
    eingaben[schluessel] = eingabe;
    return eingabe;
  };
  const zielFeld = u.art === 'halten' ? 'sek' : 'wdh';
  const zeile = el('div', { class: `satz-zeile${s.erledigt ? ' erledigt' : ''}` });
  const haken = el('button', {
    class: 'satz-haken', type: 'button', 'aria-pressed': String(Boolean(s.erledigt)), 'aria-label': `Satz ${index + 1} erledigt`,
    onclick: () => {
      // Leeres Ziel-Feld beim Abhaken mit dem Zielwert füllen (wie in gängigen Trainings-Apps)
      if (!s.erledigt && s[zielFeld] == null && zielWert != null) {
        s[zielFeld] = zielWert;
        eingaben[zielFeld].value = zielWert;
      }
      s.erledigt = !s.erledigt;
      zeile.classList.toggle('erledigt', s.erledigt);
      haken.setAttribute('aria-pressed', String(s.erledigt));
      speichern();
      if (s.erledigt) startePause();
    },
  }, icon('haken', 18));
  setze(zeile,
    el('button', { class: 'satz-nr', type: 'button', 'aria-label': `Satz ${index + 1} entfernen`, title: 'Antippen zum Entfernen', onclick: entfernen }, String(index + 1)),
    u.art === 'halten' ? zahlEingabe('sek', 'Sekunden', zielWert) : zahlEingabe('kg', 'Gewicht', u.art === 'kraft' ? 'kg' : '0'),
    u.art === 'halten' ? el('span') : zahlEingabe('wdh', 'Wiederholungen', zielWert),
    haken);
  return zeile;
}

// ---------------------------------------------------------------- Pausentimer

function ladePause() {
  try { return Number(localStorage.getItem('pauseSek')) || 90; } catch { return 90; }
}

function ladeWachHalten() {
  try { return localStorage.getItem('wachHalten') !== 'aus'; } catch { return true; }
}

/** Zahnrad-Einstellungen des Trainings (pro Gerät). */
function trainingsEinstellungen() {
  const pause = el('input', {
    type: 'number', inputMode: 'numeric', min: 15, step: 15, value: ladePause(), 'aria-label': 'Pause in Sekunden',
    oninput: () => { if (pause.valueAsNumber >= 15) { try { localStorage.setItem('pauseSek', String(pause.valueAsNumber)); } catch { /* egal */ } } },
  });
  return el('div', {},
    el('h2', { class: 'abschnitt' }, 'Workout'),
    el('label', { class: 'feld' }, el('span', {}, 'Pausentimer nach jedem Satz (Sekunden)'), pause),
    schalter(ladeWachHalten(), (an) => { try { localStorage.setItem('wachHalten', an ? 'an' : 'aus'); } catch { /* egal */ } },
      'Bildschirm während des Workouts anlassen'));
}

function startePause() {
  document.querySelector('.pausen-leiste')?.remove();
  let gesamt = ladePause();
  let ende = Date.now() + gesamt * 1000;
  const anzeige = el('strong', {});
  const balken = el('div');
  const anpassen = (sek) => {
    ende += sek * 1000;
    gesamt = Math.max(15, gesamt + sek);
    try { localStorage.setItem('pauseSek', String(gesamt)); } catch { /* egal */ }
  };
  const leiste = el('div', { class: 'pausen-leiste', role: 'timer' },
    el('div', { class: 'pausen-balken' }, balken),
    el('span', {}, 'Pause '), anzeige,
    el('button', { class: 'chip', type: 'button', onclick: () => anpassen(-15) }, '−15'),
    el('button', { class: 'chip', type: 'button', onclick: () => anpassen(15) }, '+15'),
    el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Pause beenden', onclick: () => leiste.remove() }, icon('schliessen', 18)));
  document.body.append(leiste);

  const tick = () => {
    if (!leiste.isConnected) return;
    const rest = Math.max(0, Math.round((ende - Date.now()) / 1000));
    anzeige.textContent = `${Math.floor(rest / 60)}:${String(rest % 60).padStart(2, '0')}`;
    balken.style.width = `${(rest / gesamt) * 100}%`;
    if (rest === 0) {
      navigator.vibrate?.([200, 100, 200]);
      leiste.classList.add('fertig');
      anzeige.textContent = 'Los geht’s!';
      setTimeout(() => leiste.remove(), 4000);
      return;
    }
    setTimeout(tick, 250);
  };
  tick();
}

// ---------------------------------------------------------------- Abschluss

function oeffneAbschluss(k, tag, t) {
  const dialog = el('dialog', { class: 'dialog' });
  const schliessen = () => { dialog.close(); dialog.remove(); };
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); schliessen(); });
  document.body.append(dialog);

  const entwurf = { intensitaet: t.intensitaet, zusatz: t.zusatz, dauerMin: dauerMin(t) };
  const vorschau = el('p', { class: 'vorschau' });
  const st = statistik(t);
  const aktualisiere = () => {
    const probe = { ...t, ...entwurf, ende: new Date().toISOString() };
    vorschau.textContent = `≈ ${kcalText(kcalTraining(probe, verzeichnis, k.gewichtKg))} verbrannt`;
  };
  const dauer = el('input', {
    type: 'number', inputMode: 'numeric', min: 1, value: entwurf.dauerMin, 'aria-label': 'Dauer in Minuten',
    oninput: () => { entwurf.dauerMin = dauer.valueAsNumber || 0; aktualisiere(); },
  });
  const intensitaet = el('div', { class: 'chips' });
  const zeichneIntensitaet = () => setze(intensitaet, ...Object.entries(INTENSITAETEN).map(([id, name]) => el('button', {
    class: `chip${entwurf.intensitaet === id ? ' an' : ''}`, type: 'button',
    onclick: () => { entwurf.intensitaet = id; zeichneIntensitaet(); aktualisiere(); },
  }, name)));
  zeichneIntensitaet();

  const speichernUndBeenden = async () => {
    Object.assign(t, { intensitaet: entwurf.intensitaet, zusatz: entwurf.zusatz, dauerMin: entwurf.dauerMin, ende: new Date().toISOString() });
    await speichereTag(tag);
    await schreibe('einstellungen', 'aktivesTraining', null);
    schliessen();
    stoppeWorkoutHilfen();
    lade(k.wurzel);
  };

  setze(dialog,
    el('div', { class: 'dialog-kopf' },
      el('h2', {}, 'Workout beenden'),
      el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Weiter trainieren', onclick: schliessen }, icon('schliessen'))),
    el('div', { class: 'dialog-inhalt' },
      el('section', { class: 'karte hero' },
        el('h2', {}, `💪 ${t.name}`),
        el('div', { class: 'statistik' },
          statKachel(`${st.saetze}`, 'Sätze'),
          statKachel(zahl(st.wdh), 'Wdh'),
          statKachel(`${zahl(st.volumen)}`, 'kg bewegt'))),
      el('label', { class: 'feld' }, el('span', {}, 'Dauer (min)'), dauer),
      el('div', { class: 'feld' }, el('span', {}, 'Wie anstrengend war es?'), intensitaet),
      schalter(entwurf.zusatz, (wert) => { entwurf.zusatz = wert; }, 'Zusätzliches Training',
        el('span', { class: 'leise klein' }, ' – erhöht dein heutiges Kalorienziel')),
      vorschau,
      el('button', { class: 'knopf voll', type: 'button', onclick: speichernUndBeenden }, 'Speichern')));
  aktualisiere();
  dialog.showModal();
}

function statKachel(wert, beschriftung) {
  return el('div', { class: 'stat' }, el('strong', {}, wert), el('span', {}, beschriftung));
}

// ---------------------------------------------------------------- Cardio / Sport

function aktivitaetEintragen(k, tag) {
  oeffneUebungDialog({
    titel: 'Cardio, Sport & mehr',
    kategorien: ['cardio', 'sport', 'mobility', 'alltag'],
    beiAuswahl: (u) => oeffneAktivitaet(k, tag, u),
  });
}

function oeffneAktivitaet(k, tag, u) {
  const dialog = el('dialog', { class: 'dialog' });
  const schliessen = () => { dialog.close(); dialog.remove(); };
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); schliessen(); });
  document.body.append(dialog);

  const entwurf = { typ: 'aktivitaet', uebungId: u.id, dauerMin: 30, km: null, intensitaet: 'mittel', zusatz: standardZusatz(k.profil) };
  const vorschau = el('p', { class: 'vorschau' });
  const aktualisiere = () => { vorschau.textContent = `≈ ${kcalText(kcalTraining(entwurf, verzeichnis, k.gewichtKg))} verbrannt`; };

  const dauer = el('input', {
    type: 'number', inputMode: 'numeric', min: 1, value: entwurf.dauerMin, 'aria-label': 'Dauer in Minuten',
    oninput: () => { entwurf.dauerMin = dauer.valueAsNumber || 0; aktualisiere(); },
  });
  const dauerChips = el('div', { class: 'chips' }, ...[15, 30, 45, 60, 90].map((min) => el('button', {
    class: 'chip', type: 'button', onclick: () => { dauer.value = min; entwurf.dauerMin = min; aktualisiere(); },
  }, `${min} min`)));
  const km = u.distanz ? el('input', {
    type: 'number', inputMode: 'decimal', min: 0, step: 'any', placeholder: 'optional', 'aria-label': 'Distanz in km',
    oninput: (e) => { entwurf.km = e.target.value === '' ? null : e.target.valueAsNumber; },
  }) : null;
  const intensitaet = el('div', { class: 'chips' });
  const zeichneIntensitaet = () => setze(intensitaet, ...Object.entries(INTENSITAETEN).map(([id, name]) => el('button', {
    class: `chip${entwurf.intensitaet === id ? ' an' : ''}`, type: 'button',
    onclick: () => { entwurf.intensitaet = id; zeichneIntensitaet(); aktualisiere(); },
  }, name)));
  zeichneIntensitaet();

  const speichern = async () => {
    if (!(entwurf.dauerMin > 0)) return;
    tag.trainings.push({ ...entwurf, id: neueId(), start: new Date().toISOString() });
    await speichereTag(tag);
    schliessen();
    lade(k.wurzel);
  };

  setze(dialog,
    el('div', { class: 'dialog-kopf' },
      el('h2', {}, u.name),
      el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Schließen', onclick: schliessen }, icon('schliessen'))),
    el('div', { class: 'dialog-inhalt' },
      el('label', { class: 'feld' }, el('span', {}, 'Dauer (min)'), dauer),
      dauerChips,
      km ? el('label', { class: 'feld' }, el('span', {}, 'Distanz (km)'), km) : null,
      el('div', { class: 'feld' }, el('span', {}, 'Intensität'), intensitaet),
      schalter(entwurf.zusatz, (wert) => { entwurf.zusatz = wert; }, 'Zusätzliches Training',
        el('span', { class: 'leise klein' }, ' – erhöht dein heutiges Kalorienziel')),
      vorschau,
      el('button', { class: 'knopf voll', type: 'button', onclick: speichern }, 'Speichern')));
  aktualisiere();
  dialog.showModal();
}
