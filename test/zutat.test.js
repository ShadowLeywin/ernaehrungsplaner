import assert from 'node:assert/strict';
import test from 'node:test';
import { parseZahl, pruefeMenge, pruefeZutat } from '../js/logik/zutat.js';

const gut = { name: ' Testriegel ', marke: 'Muster', kategorie: 'suesses', portionName: 'Riegel', portionGramm: '35', je100: { kcal: '412', protein: '20,5', kh: '45', zucker: '12', fett: '15', gesFett: '6', ballaststoffe: '', salz: '0,4' } };

test('parseZahl versteht Komma und Punkt', () => {
  assert.equal(parseZahl('12,5'), 12.5);
  assert.equal(parseZahl(' 7 '), 7);
  assert.equal(parseZahl(''), null);
  assert.ok(Number.isNaN(parseZahl('abc')));
  assert.ok(Number.isNaN(parseZahl('1.2.3')));
});

test('gültige Eingabe ergibt eine saubere Zutat', () => {
  const { ok, zutat } = pruefeZutat(gut);
  assert.equal(ok, true);
  assert.equal(zutat.name, 'Testriegel');
  assert.equal(zutat.quelle, 'eigen');
  assert.deepEqual(zutat.je100, { kcal: 412, protein: 20.5, kh: 45, zucker: 12, fett: 15, gesFett: 6, salz: 0.4 });
  assert.deepEqual(zutat.portionen, [{ name: 'Riegel', gramm: 35 }]);
  assert.equal(zutat.unvollstaendig, false);
});

test('Name und Energie sind Pflicht', () => {
  const { ok, fehler, zutat } = pruefeZutat({ name: '', je100: {} });
  assert.equal(ok, false);
  assert.equal(zutat, null);
  assert.ok(fehler.name && fehler.kcal);
});

test('unplausible Werte werden abgelehnt', () => {
  const f = (je100) => pruefeZutat({ name: 'x', je100: { kcal: '100', ...je100 } }).fehler;
  assert.ok(f({ kcal: '950' }).kcal);
  assert.ok(f({ protein: '-1' }).protein);
  assert.ok(f({ fett: '120' }).fett);
  assert.ok(f({ kh: '10', zucker: '20' }).zucker);
  assert.ok(f({ fett: '5', gesFett: '9' }).gesFett);
  assert.ok(f({ protein: '50', kh: '40', fett: '30' }).summe);
  assert.ok(f({ protein: 'viel' }).protein);
});

test('fehlende Makros kennzeichnen die Zutat als unvollständig', () => {
  const { ok, zutat } = pruefeZutat({ name: 'Nur Energie', je100: { kcal: '50' } });
  assert.equal(ok, true);
  assert.equal(zutat.unvollstaendig, true);
  assert.equal(zutat.kategorie, 'sonstiges');
  assert.deepEqual(zutat.portionen, []);
});

test('Portion ohne Bezeichnung heißt "Portion", ungültiges Gewicht ist ein Fehler', () => {
  assert.deepEqual(pruefeZutat({ name: 'x', portionGramm: '30', je100: { kcal: '1' } }).zutat.portionen, [{ name: 'Portion', gramm: 30 }]);
  assert.ok(pruefeZutat({ name: 'x', portionGramm: '0', je100: { kcal: '1' } }).fehler.portionGramm);
});

test('pruefeMenge', () => {
  assert.deepEqual(pruefeMenge('80'), { ok: true, gramm: 80 });
  assert.deepEqual(pruefeMenge('12,5'), { ok: true, gramm: 12.5 });
  assert.equal(pruefeMenge('').ok, false);
  assert.equal(pruefeMenge('0').ok, false);
  assert.equal(pruefeMenge('-3').ok, false);
  assert.equal(pruefeMenge('6000').ok, false);
  assert.equal(pruefeMenge('abc').ok, false);
});
