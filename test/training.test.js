import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UEBUNGEN, KATEGORIEN, MUSKELN, EQUIPMENT } from '../js/daten/uebungen.js';
import {
  uebungsVerzeichnis, nettoKcal, dauerMin, einheitsArt, kcalTraining, statistik, letzteLeistung,
  saetzeText, einRM, zusatzKcal, zielMitZusatz,
} from '../js/logic/training.js';
import { kcalAusMakros } from '../js/logic/ziele.js';

const verzeichnis = uebungsVerzeichnis(UEBUNGEN);
const nahe = (ist, soll, toleranz) => assert.ok(Math.abs(ist - soll) <= toleranz, `${ist} statt ca. ${soll}`);
const satz = (wdh, kg = 0, erledigt = true) => ({ wdh, kg, erledigt });

test('Datenbank: groß, eindeutige ids, gültige Kategorien, Muskeln und Equipment', () => {
  assert.ok(UEBUNGEN.length >= 200, `nur ${UEBUNGEN.length} Einträge`);
  const ids = new Set();
  for (const u of UEBUNGEN) {
    assert.ok(!ids.has(u.id), `doppelt: ${u.id}`);
    ids.add(u.id);
    assert.ok(KATEGORIEN[u.kategorie], u.id);
    assert.ok(EQUIPMENT[u.equipment], `${u.id}: ${u.equipment}`);
    for (const m of u.muskeln) assert.ok(MUSKELN[m], `${u.id}: ${m}`);
    if (u.met) assert.ok(u.met.leicht <= u.met.mittel && u.met.mittel <= u.met.hart, `${u.id}: MET-Reihenfolge`);
  }
  for (const k of Object.keys(KATEGORIEN)) assert.ok(UEBUNGEN.some((u) => u.kategorie === k), k);
});

test('Netto-kcal: (MET − 1) × kg × h', () => {
  assert.equal(nettoKcal(5, 75, 60), 300);
  assert.equal(nettoKcal(0.5, 75, 60), 0);
});

test('Aktivität: 45 min Laufen normal bei 75 kg', () => {
  const t = { typ: 'aktivitaet', uebungId: 'laufen', dauerMin: 45, intensitaet: 'mittel' };
  nahe(kcalTraining(t, verzeichnis, 75), (9.8 - 1) * 75 * 0.75, 0.1); // 495
});

test('Workout: Dauer aus Start/Ende, Kraft-MET nach Intensität', () => {
  const t = {
    typ: 'workout', start: '2026-10-05T17:00:00Z', ende: '2026-10-05T18:00:00Z', intensitaet: 'hart',
    uebungen: [{ uebungId: 'bankdruecken_lh', saetze: [satz(8, 60)] }],
  };
  assert.equal(dauerMin(t), 60);
  assert.equal(einheitsArt(t, verzeichnis), 'gym');
  nahe(kcalTraining(t, verzeichnis, 75), 375, 0.1); // (6 − 1) × 75 × 1
});

test('Workout mit Cardio-Teil: Cardio-Minuten mit eigenem MET, Rest als Kraft', () => {
  const t = {
    typ: 'workout', start: '2026-10-05T17:00:00Z', ende: '2026-10-05T18:00:00Z', intensitaet: 'mittel',
    uebungen: [{ uebungId: 'kniebeuge_lh', saetze: [satz(5, 100)] }, { uebungId: 'crosstrainer', cardio: { min: 15 } }],
  };
  nahe(kcalTraining(t, verzeichnis, 80), (5.0 - 1) * 80 * 0.25 + (5.0 - 1) * 80 * 0.75, 0.1);
});

test('Calisthenics-Einheit wird erkannt', () => {
  const t = { typ: 'workout', uebungen: [{ uebungId: 'klimmzuege' }, { uebungId: 'dips' }, { uebungId: 'curls_kh' }] };
  assert.equal(einheitsArt(t, verzeichnis), 'calisthenics');
});

test('Statistik zählt nur erledigte Sätze', () => {
  const t = { uebungen: [{ uebungId: 'x', saetze: [satz(10, 50), satz(8, 50), satz(8, 50, false)] }] };
  assert.deepEqual(statistik(t), { saetze: 2, wdh: 18, volumen: 900 });
});

test('Letzte Leistung: neuestes früheres Training, aktuelles ausgenommen', () => {
  const tage = [
    { datum: '2026-10-01', trainings: [{ id: 'a', typ: 'workout', start: '2026-10-01T17:00', uebungen: [{ uebungId: 'bankdruecken_lh', saetze: [satz(8, 55)] }] }] },
    { datum: '2026-10-03', trainings: [{ id: 'b', typ: 'workout', start: '2026-10-03T17:00', uebungen: [{ uebungId: 'bankdruecken_lh', saetze: [satz(8, 60), satz(7, 60)] }] }] },
    { datum: '2026-10-05', trainings: [{ id: 'c', typ: 'workout', start: '2026-10-05T17:00', uebungen: [{ uebungId: 'bankdruecken_lh', saetze: [satz(8, 62.5)] }] }] },
  ];
  const letzte = letzteLeistung('bankdruecken_lh', tage, 'c');
  assert.equal(letzte.datum, '2026-10-03');
  assert.equal(letzte.saetze.length, 2);
  assert.equal(letzteLeistung('kniebeuge_lh', tage), null);
});

test('Sätze als Text', () => {
  assert.equal(saetzeText([satz(8, 60), satz(8, 60), satz(8, 60)], 'kraft'), '3 × 8 · 60 kg');
  assert.equal(saetzeText([satz(8, 60), satz(6, 62.5)], 'kraft'), '8×60, 6×62,5 kg');
  assert.equal(saetzeText([satz(10), satz(8)], 'koerpergewicht'), '10, 8 Wdh');
  assert.equal(saetzeText([{ sek: 20 }, { sek: 15 }], 'halten'), '20, 15 s');
});

test('1RM nach Epley', () => {
  assert.equal(einRM(100, 1), 100);
  nahe(einRM(100, 5), 116.7, 0.1);
});

test('Zusatz-kcal: nur Zusatz-Training und nur abgeschlossene Workouts', () => {
  const tag = {
    trainings: [
      { typ: 'aktivitaet', uebungId: 'fussball', dauerMin: 60, intensitaet: 'mittel', zusatz: true },
      { typ: 'aktivitaet', uebungId: 'ebike', dauerMin: 30, intensitaet: 'mittel', zusatz: false },
      { typ: 'workout', start: '2026-10-05T17:00:00Z', ende: null, zusatz: true, uebungen: [] },
    ],
  };
  nahe(zusatzKcal(tag, verzeichnis, 75), 525, 0.1); // (8 − 1) × 75 × 1
});

test('Ziel mit Zusatz: kcal steigen (25er), Protein bleibt, Makros passen', () => {
  const typ = { kcal: 2400, protein: 175, kh: 293, fett: 59 };
  const ziel = zielMitZusatz(typ, 512);
  assert.equal(ziel.extraKcal, 500);
  assert.equal(ziel.kcal, 2900);
  assert.equal(ziel.protein, 175);
  assert.ok(Math.abs(kcalAusMakros(ziel) - 2900) <= 5);
  assert.equal(zielMitZusatz(typ, 0).kcal, 2400);
});
