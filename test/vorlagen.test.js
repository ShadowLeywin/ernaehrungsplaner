import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UEBUNGEN } from '../js/daten/uebungen.js';
import { uebungsVerzeichnis } from '../js/logic/training.js';
import { vorlagenFuerTag, erledigteVorlagen, workoutAusVorlage } from '../js/logic/vorlagen.js';
import { monatsDurchschnitte, monatsBericht } from '../js/logic/gewicht.js';

const verzeichnis = uebungsVerzeichnis(UEBUNGEN);
const nahe = (ist, soll, toleranz) => assert.ok(Math.abs(ist - soll) <= toleranz, `${ist} statt ca. ${soll}`);

const vorlagen = [
  { id: 'push1', name: 'Push 1', tage: [0], uhrzeit: '17:15', uebungen: [
    { uebungId: 'handstand_primer', minuten: 9 },
    { uebungId: 'schraegbank_smith', saetze: 3, ziel: '6–10' },
    { uebungId: 'gibtsnicht', saetze: 3 },
  ] },
  { id: 'morgen', name: 'Morgenroutine', tage: [0, 1, 2, 3, 4, 5], uhrzeit: '06:30', uebungen: [{ uebungId: 'dead_hang', saetze: 2, ziel: '45–60 s' }] },
  { id: 'skills', name: 'Skills', tage: [6], uhrzeit: '', uebungen: [] },
];

test('Vorlagen für einen Tag, nach Uhrzeit sortiert (ohne Uhrzeit ans Ende)', () => {
  assert.deepEqual(vorlagenFuerTag(vorlagen, new Date(2026, 9, 5)).map((v) => v.id), ['morgen', 'push1']); // Montag
  assert.deepEqual(vorlagenFuerTag(vorlagen, new Date(2026, 9, 11)).map((v) => v.id), ['skills']); // Sonntag
});

test('Workout aus Vorlage: Primer als Dauer, Sätze leer ohne Vorgeschichte, unbekannte Übungen fallen weg', () => {
  const w = workoutAusVorlage(vorlagen[0], [], verzeichnis, { id: 'w1', jetzt: new Date('2026-10-05T17:15:00Z') });
  assert.equal(w.vorlageId, 'push1');
  assert.equal(w.name, 'Push 1');
  assert.equal(w.uebungen.length, 2);
  assert.deepEqual(w.uebungen[0].cardio, { min: 9, km: null });
  assert.equal(w.uebungen[1].saetze.length, 3);
  assert.equal(w.uebungen[1].saetze[0].wdh, undefined);
  assert.equal(w.uebungen[1].ziel, '6–10');
});

test('Workout aus Vorlage: Werte vom letzten Mal, Halteübung mit Zielzeit', () => {
  const tage = [{ datum: '2026-10-01', trainings: [{ id: 'alt', typ: 'workout', start: '2026-10-01T17:00', uebungen: [
    { uebungId: 'schraegbank_smith', saetze: [{ wdh: 8, kg: 50, erledigt: true }, { wdh: 7, kg: 50, erledigt: true }] },
  ] }] }];
  const w = workoutAusVorlage(vorlagen[0], tage, verzeichnis, { id: 'w2' });
  assert.deepEqual(w.uebungen[1].saetze.map((s) => `${s.wdh}×${s.kg}`), ['8×50', '7×50', '7×50']);
  const m = workoutAusVorlage(vorlagen[1], [], verzeichnis, { id: 'w3' });
  assert.equal(m.uebungen[0].saetze[0].sek, 45);
});

test('Erledigte Vorlagen: nur abgeschlossene Workouts zählen', () => {
  const tag = { trainings: [{ vorlageId: 'push1', ende: '2026-10-05T18:30:00Z' }, { vorlageId: 'morgen', ende: null }] };
  assert.deepEqual([...erledigteVorlagen(tag)], ['push1']);
});

test('Monatsdurchschnitte und Monatsbericht mit Vormonat', () => {
  const reihe = [
    ...Array.from({ length: 10 }, (_, i) => ({ datum: `2026-09-${String(i + 15).padStart(2, '0')}`, kg: 74 })),
    ...Array.from({ length: 28 }, (_, i) => ({ datum: `2026-10-${String(i + 1).padStart(2, '0')}`, kg: 74 + i * 0.04 })),
  ];
  const monate = monatsDurchschnitte(reihe);
  assert.deepEqual(monate.map((m) => m.monat), ['2026-09', '2026-10']);
  const b = monatsBericht(reihe, '2026-10');
  assert.equal(b.anzahl, 28);
  nahe(b.anfang, 74.12, 0.01);
  nahe(b.ende, 74.96, 0.01); // Ø der letzten 7 Werte (Tag 22–28)
  nahe(b.aenderung, 0.84, 0.01);
  nahe(b.gegenVormonat, 0.54, 0.01);
  assert.equal(monatsBericht(reihe, '2026-08'), null);
});
