// Alle Werte in diesen Tests sind erfunden.
import assert from 'node:assert/strict';
import test from 'node:test';
import { bereichText, laborGruppen, laborStatus, pruefeLaborwert, pruefeSymptom, vorSymptomen } from '../js/logik/befunde.js';

test('laborStatus ordnet gegen den eingetragenen Bereich ein', () => {
  assert.equal(laborStatus({ wert: 4, refMin: 3.5, refMax: 5 }), 'im');
  assert.equal(laborStatus({ wert: 3.5, refMin: 3.5, refMax: 5 }), 'im');
  assert.equal(laborStatus({ wert: 3, refMin: 3.5, refMax: 5 }), 'unter');
  assert.equal(laborStatus({ wert: 6, refMin: 3.5, refMax: 5 }), 'ueber');
  assert.equal(laborStatus({ wert: 6, refMax: 5 }), 'ueber');
  assert.equal(laborStatus({ wert: 1, refMax: 5 }), 'im');
  assert.equal(laborStatus({ wert: 6 }), 'ohne');
});

test('bereichText beschreibt beide, eine oder keine Grenze', () => {
  assert.equal(bereichText({ refMin: 3.5, refMax: 5, einheit: 'mmol/l' }), '3,5 bis 5 mmol/l');
  assert.equal(bereichText({ refMin: 30 }), 'ab 30');
  assert.equal(bereichText({ refMax: 200, einheit: 'mg/dl' }), 'bis 200 mg/dl');
  assert.equal(bereichText({}), '');
});

test('pruefeLaborwert: gültige Eingabe, Grenzen sind freiwillig', () => {
  const p = pruefeLaborwert({ name: ' Testwert A ', wert: '4,2', einheit: 'mmol/l', refMin: '3,5', refMax: '5', datum: '2026-11-10', notiz: '' });
  assert.equal(p.ok, true);
  assert.deepEqual(p.laborwert, { name: 'Testwert A', wert: 4.2, einheit: 'mmol/l', datum: '2026-11-10', refMin: 3.5, refMax: 5 });
  const ohne = pruefeLaborwert({ name: 'Testwert B', wert: '12', datum: '2026-11-10' });
  assert.equal(ohne.ok, true);
  assert.equal('refMin' in ohne.laborwert, false);
});

test('pruefeLaborwert: Pflichtfelder und vertauschte Grenzen', () => {
  const p = pruefeLaborwert({ name: '', wert: 'hoch', refMin: '5', refMax: '3', datum: 'gestern' });
  assert.equal(p.ok, false);
  assert.deepEqual(Object.keys(p.fehler).sort(), ['datum', 'name', 'refMax', 'wert']);
  assert.ok(pruefeLaborwert({ name: 'x', wert: '1', refMin: 'abc', datum: '2026-11-10' }).fehler.refMin);
});

test('laborGruppen: je Name neueste zuerst, Namen alphabetisch', () => {
  const g = laborGruppen([
    { name: 'Testwert B', datum: '2026-10-01', wert: 1 },
    { name: 'Testwert A', datum: '2026-09-01', wert: 2 },
    { name: 'Testwert A', datum: '2026-11-01', wert: 3 },
  ]);
  assert.deepEqual(g.map((x) => x.name), ['Testwert A', 'Testwert B']);
  assert.deepEqual(g[0].werte.map((w) => w.wert), [3, 2]);
});

test('pruefeSymptom: Art und Stärke sind Pflicht, Uhrzeit wird geprüft, doppelte Zuordnung entfällt', () => {
  const p = pruefeSymptom({ art: ' Testsymptom ', staerke: '3', datum: '2026-11-10', zeit: '14:30', eintragIds: ['a', 'a', 'b'], notiz: ' nach dem Essen ' });
  assert.equal(p.ok, true);
  assert.deepEqual(p.symptom, { art: 'Testsymptom', staerke: 3, datum: '2026-11-10', eintragIds: ['a', 'b'], zeit: '14:30', notiz: 'nach dem Essen' });
  const f = pruefeSymptom({ art: '', staerke: '9', datum: '', zeit: '25:00' }).fehler;
  assert.deepEqual(Object.keys(f).sort(), ['art', 'datum', 'staerke', 'zeit']);
  assert.equal(pruefeSymptom({ art: 'x', staerke: 1, datum: '2026-11-10' }).ok, true);
});

test('vorSymptomen zählt je Lebensmittel die Symptome und die Tage, an denen es gegessen wurde', () => {
  const e = (id, name, datum) => ({ id, name, datum });
  const eintraege = [e('1', 'Testmilch', '2026-11-01'), e('2', 'Testbrot', '2026-11-01'), e('3', 'Testmilch', '2026-11-02'), e('4', 'Testmilch', '2026-11-03'), e('5', 'Testbrot', '2026-11-03'), e('6', 'Testapfel', '2026-11-03')];
  const symptome = [
    { eintragIds: ['1', '2'] },
    { eintragIds: ['3'] },
    { eintragIds: ['4', '4', '6', 'gibt-es-nicht'] },
    { eintragIds: [] },
  ];
  assert.deepEqual(vorSymptomen(symptome, eintraege), [{ name: 'Testmilch', beiSymptomen: 3, tageGegessen: 3 }]);
  assert.deepEqual(vorSymptomen(symptome, eintraege, 1).map((x) => [x.name, x.beiSymptomen, x.tageGegessen]), [['Testmilch', 3, 3], ['Testapfel', 1, 1], ['Testbrot', 1, 2]]);
  assert.deepEqual(vorSymptomen([], eintraege), []);
});
