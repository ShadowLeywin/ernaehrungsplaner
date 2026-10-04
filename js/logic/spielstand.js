// Spielstand: sammelt aus allen Tagen die Kennzahlen für Charakter-Werte, Level und Erfolge (reine Funktionen).
import { alleTrainings, eintragsLeistung } from './fortschritt.js';
import { dauerMin, einRM } from './training.js';
import { tagestypFuerDatum, datumSchluessel } from './ziele.js';
import { tagesNaehrwerte, gemueseObstGramm } from './tag.js';
import { wasserBisUhrzeit } from './wasser.js';

// Übungsfamilien für Summen-Erfolge
export const FAMILIEN = {
  klimmzug: ['klimmzuege', 'chin_ups', 'klimmzuege_breit', 'archer_pullups', 'typewriter_pullups', 'l_sit_pullups', 'explosive_pullups', 'muscle_up', 'ring_muscle_up'],
  liegestuetz: ['liegestuetze', 'liegestuetze_eng', 'liegestuetze_breit', 'liegestuetze_erhoeht', 'archer_pushups', 'pseudo_planche_pushups', 'pike_pushups', 'handstand_pushups'],
  dip: ['dips', 'ring_dips', 'bankdips', 'korean_dips'],
};
const LAUFEN = new Set(['laufen', 'laufband', 'intervalllauf']);
const RAD = new Set(['radfahren', 'mountainbike', 'ebike', 'spinning', 'ergometer']);
const HAUPTUEBUNGEN = { bank: 'bankdruecken_lh', kniebeuge: 'kniebeuge_lh', kreuzheben: 'kreuzheben', schulter: 'military_press' };

const tagVorher = (schluessel, n) => {
  const d = new Date(`${schluessel}T12:00:00`);
  d.setDate(d.getDate() - n);
  return datumSchluessel(d);
};

/** Längste Folge aufeinanderfolgender Tage in einer sortierten Liste von Datumsschlüsseln. */
export function laengsteFolge(schluessel) {
  let laengste = 0;
  let aktuell = 0;
  let vorher = null;
  for (const s of [...new Set(schluessel)].sort()) {
    aktuell = vorher && tagVorher(s, 1) === vorher ? aktuell + 1 : 1;
    laengste = Math.max(laengste, aktuell);
    vorher = s;
  }
  return laengste;
}

/** Aktuelle Folge bis heute (oder gestern, damit ein noch offener Tag die Folge nicht bricht). */
export function aktuelleFolge(schluessel, heute) {
  const menge = new Set(schluessel);
  let tag = menge.has(heute) ? heute : tagVorher(heute, 1);
  let n = 0;
  while (menge.has(tag)) { n += 1; tag = tagVorher(tag, 1); }
  return n;
}

/**
 * Alle Kennzahlen. tage: Tagesdatensätze, profil, lebensmittel, verzeichnis (Übungen), kgKoerper.
 */
export function sammleStatistik({ tage, profil, lebensmittel, verzeichnis, kgKoerper, heute = new Date() }) {
  const heuteS = datumSchluessel(heute);
  const vor28 = tagVorher(heuteS, 27);
  const st = {
    workouts: 0, aktivitaeten: 0, saetze: 0, volumenKg: 0, cardioMin: 0, cardioMin28: 0, km: 0,
    mobilityMin: 0, mobilityMin28: 0, hartEinheiten: 0, rekorde: 0, maxLaufKmh: 0, maxRadKmh: 0,
    familien: { klimmzug: 0, liegestuetz: 0, dip: 0 }, maxSek: {}, verhaeltnis: { bank: 0, kniebeuge: 0, kreuzheben: 0, schulter: 0 },
    trainingsTage: [], logTage: [], proteinTage: 0, kcalTage: 0, gemueseTage: 0, obstTage: 0, wasserTage: 0,
    supplementTage: 0, gewichtTage: 0, perfekteTage: 0, tagebuchTage: 0,
    logTage28: 0, gewichtTage28: 0, wasserTage28: 0, supplementTage28: 0, trainings28: 0,
    geheim: { frueh: false, spaet: false, reiseimer: false, festtag: false, doppelschicht: false, comeback: false, perfekt: false, mitternacht: false },
  };

  // ---------- Training
  const trainingsJeTag = new Map();
  for (const { datum, t } of alleTrainings(tage)) {
    const minuten = dauerMin(t);
    const imFenster = datum >= vor28;
    if (imFenster) st.trainings28 += 1;
    trainingsJeTag.set(datum, (trainingsJeTag.get(datum) ?? 0) + (t.typ === 'workout' ? 1 : 0));
    if (t.intensitaet === 'hart') st.hartEinheiten += 1;
    st.rekorde += t.rekorde?.length ?? 0;
    const stunde = t.start ? new Date(t.start).getHours() : 12;
    if (stunde < 6) st.geheim.frueh = true;
    if (stunde >= 22) st.geheim.spaet = true;
    if (/-12-2[456]$|-01-01$/.test(datum)) st.geheim.festtag = true;

    if (t.typ === 'aktivitaet') {
      st.aktivitaeten += 1;
      const u = verzeichnis.get(t.uebungId);
      if (u?.kategorie === 'mobility') {
        st.mobilityMin += minuten;
        if (imFenster) st.mobilityMin28 += minuten;
      } else if (u?.kategorie !== 'alltag') {
        st.cardioMin += minuten;
        if (imFenster) st.cardioMin28 += minuten;
      }
      if (t.km) {
        st.km += t.km;
        const kmh = minuten ? t.km / (minuten / 60) : 0;
        if (LAUFEN.has(t.uebungId) && kmh < 30) st.maxLaufKmh = Math.max(st.maxLaufKmh, kmh);
        if (RAD.has(t.uebungId) && kmh < 70) st.maxRadKmh = Math.max(st.maxRadKmh, kmh);
      }
      continue;
    }

    st.workouts += 1;
    for (const e of t.uebungen ?? []) {
      const u = verzeichnis.get(e.uebungId);
      if (e.uebungId === 'reiseimer' && (e.saetze ?? []).some((s) => s.erledigt)) st.geheim.reiseimer = true;
      if (e.cardio) {
        const min = e.cardio.min ?? 0;
        if (u?.kategorie === 'mobility') { st.mobilityMin += min; if (imFenster) st.mobilityMin28 += min; } else { st.cardioMin += min; if (imFenster) st.cardioMin28 += min; }
        st.km += e.cardio.km ?? 0;
        continue;
      }
      const l = eintragsLeistung(e, u, kgKoerper);
      if (!l) continue;
      st.saetze += l.saetze;
      st.volumenKg += u?.art === 'kraft' ? l.volumen : 0;
      const erledigt = e.saetze.filter((s) => s.erledigt);
      for (const [familie, ids] of Object.entries(FAMILIEN)) {
        if (ids.includes(e.uebungId)) st.familien[familie] += erledigt.reduce((s, x) => s + (x.wdh ?? 0), 0);
      }
      if (u?.art === 'halten') {
        st.maxSek[e.uebungId] = Math.max(st.maxSek[e.uebungId] ?? 0, l.sek);
        if (u.kategorie === 'mobility') {
          const min = erledigt.reduce((s, x) => s + (x.sek ?? 0), 0) / 60;
          st.mobilityMin += min;
          if (imFenster) st.mobilityMin28 += min;
        }
      }
      for (const [schluessel, id] of Object.entries(HAUPTUEBUNGEN)) {
        if (e.uebungId !== id || !kgKoerper) continue;
        const best = Math.max(...erledigt.map((s) => einRM(s.kg ?? 0, s.wdh ?? 0)));
        st.verhaeltnis[schluessel] = Math.max(st.verhaeltnis[schluessel], best / kgKoerper);
      }
    }
  }
  st.trainingsTage = [...trainingsJeTag.keys()].sort();
  st.geheim.doppelschicht = [...trainingsJeTag.values()].some((n) => n >= 2);
  // Comeback: Training nach mindestens 14 Tagen Pause
  for (let i = 1; i < st.trainingsTage.length; i += 1) {
    if (tagVorher(st.trainingsTage[i], 14) >= st.trainingsTage[i - 1]) st.geheim.comeback = true;
  }

  // ---------- Ernährung, Wasser, Gewicht, Disziplin
  for (const tag of tage) {
    const im28 = tag.datum >= vor28 && tag.datum <= heuteS;
    if (tag.gewichtKg) { st.gewichtTage += 1; if (im28) st.gewichtTage28 += 1; }
    if (tag.tagebuch?.text?.trim()) st.tagebuchTage += 1;
    const { typ } = tagestypFuerDatum(profil, new Date(`${tag.datum}T12:00:00`));
    const aktive = profil.supplements.filter((s) => s.aktiv);
    if (aktive.length && aktive.every((s) => tag.supplements?.[s.id])) { st.supplementTage += 1; if (im28) st.supplementTage28 += 1; }
    const wasserOk = (tag.wasser ?? []).length && wasserBisUhrzeit(tag.wasser, profil.wasser.mittagspause) >= typ.wasserBisMittagMl;
    if (wasserOk) { st.wasserTage += 1; if (im28) st.wasserTage28 += 1; }

    const mitMenge = (tag.eintraege ?? []).filter((e) => e.gramm > 0);
    if (mitMenge.length < 3) continue;
    st.logTage.push(tag.datum);
    if (im28) st.logTage28 += 1;
    const ist = tagesNaehrwerte(tag, profil, lebensmittel);
    const go = gemueseObstGramm(tag, lebensmittel);
    const protein = (ist.protein ?? 0) >= typ.protein * 0.95;
    const kcal = Math.abs((ist.kcal ?? 0) - typ.kcal) <= typ.kcal * 0.1;
    const gemuese = go.gemuese >= typ.gemueseG;
    if (protein) st.proteinTage += 1;
    if (kcal) st.kcalTage += 1;
    if (gemuese) st.gemueseTage += 1;
    if (go.obst >= typ.obstG) st.obstTage += 1;
    if (protein && kcal && gemuese && wasserOk && Math.abs((ist.kcal ?? 0) - typ.kcal) <= typ.kcal * 0.05) {
      st.perfekteTage += 1;
      st.geheim.perfekt = true;
    }
    if ((tag.eintraege ?? []).some((e) => { const h = new Date(e.zeit).getHours(); return h >= 0 && h < 4; })) st.geheim.mitternacht = true;
  }
  st.logTage.sort();
  st.laengsteLogFolge = laengsteFolge(st.logTage);
  st.aktuelleLogFolge = aktuelleFolge(st.logTage, heuteS);

  // Wochen mit mindestens 3 Trainingstagen
  const jeWoche = new Map();
  for (const d of st.trainingsTage) {
    const datum = new Date(`${d}T12:00:00`);
    const montag = datumSchluessel(new Date(datum.getFullYear(), datum.getMonth(), datum.getDate() - ((datum.getDay() + 6) % 7)));
    jeWoche.set(montag, (jeWoche.get(montag) ?? 0) + 1);
  }
  st.starkeWochen = [...jeWoche.values()].filter((n) => n >= 3).length;
  st.volumenKg = Math.round(st.volumenKg);
  st.cardioMin = Math.round(st.cardioMin);
  st.km = Math.round(st.km * 10) / 10;
  return st;
}
