import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UEBUNGEN } from '../js/daten/uebungen.js';
import { uebungsVerzeichnis } from '../js/logic/training.js';
import {
  alleTrainings, uebungsVerlauf, rekorde, neueRekorde, volumenJeMuskel, wochenUebersicht, trainierteUebungen,
} from '../js/logic/fortschritt.js';

const v = uebungsVerzeichnis(UEBUNGEN);
const satz = (wdh, kg, erledigt = true) => ({ wdh, kg, erledigt });
const workout = (id, uebungen, start = '2026-10-01T17:00:00Z') => ({ id, typ: 'workout', start, ende: start, uebungen });

const tage = [
  { datum: '2026-09-28', trainings: [workout('a', [{ uebungId: 'bankdruecken_lh', saetze: [satz(8, 60), satz(8, 60)] }])] },
  { datum: '2026-10-01', trainings: [workout('b', [{ uebungId: 'bankdruecken_lh', saetze: [satz(5, 70), satz(5, 70, false)] }])] },
  { datum: '2026-10-02', trainings: [{ id: 'c', typ: 'workout', start: 'x', ende: null, uebungen: [{ uebungId: 'bankdruecken_lh', saetze: [satz(1, 200)] }] }] },
];

test('nur abgeschlossene Trainings zählen', () => {
  assert.deepEqual(alleTrainings(tage).map((x) => x.t.id), ['a', 'b']);
});

test('Verlauf mit geschätztem 1RM', () => {
  const verlauf = uebungsVerlauf('bankdruecken_lh', tage, v);
  assert.equal(verlauf.length, 2);
  assert.equal(verlauf[0].e1RM, 60 * (1 + 8 / 30));
  assert.equal(verlauf[1].saetze, 1);
  assert.equal(verlauf[0].volumen, 960);
});

test('Rekorde und neue Rekorde', () => {
  const r = rekorde(tage, v).get('bankdruecken_lh');
  assert.equal(r.kg.wert, 70);
  assert.equal(r.kg.datum, '2026-10-01');
  const neu = neueRekorde(tage[1].trainings[0], tage, v);
  assert.equal(neu.length, 1);
  assert.equal(neu[0].kennzahl, 'e1RM');
  // Erstes Training einer Übung ist kein Rekord
  assert.deepEqual(neueRekorde(workout('z', [{ uebungId: 'kniebeuge_lh', saetze: [satz(5, 100)] }]), tage, v), []);
});

test('Volumen je Muskel: Hauptmuskel 1, Hilfsmuskeln 0,5', () => {
  const vol = volumenJeMuskel(tage, v, '2026-09-28', '2026-10-04');
  assert.equal(vol.brust, 3);
  assert.equal(vol.trizeps, 1.5);
});

test('Wochenübersicht', () => {
  const w = wochenUebersicht(tage, v, 2, new Date(2026, 9, 4));
  assert.deepEqual(w.map((x) => x.montag), ['2026-09-21', '2026-09-28']);
  assert.equal(w[1].einheiten, 2);
  assert.equal(w[1].saetze, 3);
});

test('trainierte Übungen', () => {
  assert.deepEqual(trainierteUebungen(tage).map((x) => [x.uebungId, x.anzahl]), [['bankdruecken_lh', 2]]);
});
