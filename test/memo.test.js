import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zerlegeMemo, werteMemoAus, inGramm, besterTreffer } from '../js/logic/memo.js';

const LM = [
  { id: 'apfel', name: 'Apfel', stueckG: 170 },
  { id: 'apfelmus', name: 'Apfelmus' },
  { id: 'skyr', name: 'Skyr natur' },
  { id: 'haferflocken', name: 'Haferflocken' },
  { id: 'banane', name: 'Banane', stueckG: 120 },
  { id: 'olivenoel', name: 'Olivenöl' },
  { id: 'milch', name: 'Milch 1,5 %' },
];

test('Menge nach dem Namen', () => {
  assert.deepEqual(zerlegeMemo('Skyr 250 Haferflocken 80'), [
    { menge: 250, einheit: null, woerter: ['skyr'] },
    { menge: 80, einheit: null, woerter: ['haferflocken'] },
  ]);
});

test('Menge vor dem Namen mit Einheit und Komma', () => {
  assert.deepEqual(zerlegeMemo('250 g Skyr von Ehrmann, 1,5 EL Olivenöl'), [
    { menge: 250, einheit: 'g', woerter: ['skyr', 'ehrmann'] },
    { menge: 1.5, einheit: 'el', woerter: ['olivenoel'] },
  ]);
});

test('Zahlwörter und „und“', () => {
  const r = zerlegeMemo('zwei Äpfel und eine Banane');
  assert.equal(r.length, 2);
  assert.equal(r[0].menge, 2);
  assert.equal(r[1].menge, 1);
});

test('Zusammengeschrieben: 80g', () => {
  assert.deepEqual(zerlegeMemo('80g haferflocken'), [{ menge: 80, einheit: 'g', woerter: ['haferflocken'] }]);
});

test('Stück-Lebensmittel ohne Einheit', () => {
  assert.equal(inGramm(2, null, LM[0]), 340);
  assert.equal(inGramm(150, null, LM[0]), 150);
  assert.equal(inGramm(1, 'el', LM[5]), 15);
  assert.equal(inGramm(1, 'glas', LM[6]), 200);
});

test('Treffer: Apfel vor Apfelmus, Plural', () => {
  assert.equal(besterTreffer(LM, ['aepfel']).id, 'apfel');
  assert.equal(besterTreffer(LM, ['apfelmus']).id, 'apfelmus');
  assert.equal(besterTreffer(LM, ['xyz']), null);
});

test('Memo setzt Mengen bei vorhandenen Einträgen', () => {
  const vorhandene = [{ id: 'e1', lebensmittelId: 'skyr', gramm: 0 }, { id: 'e2', lebensmittelId: 'apfel', gramm: 0 }];
  const r = werteMemoAus('Skyr 300, 1 Apfel, 40 g Haferflocken', LM, vorhandene);
  assert.deepEqual(r.map((x) => [x.lebensmittel?.id, x.gramm, x.eintragId]), [
    ['skyr', 300, 'e1'], ['apfel', 170, 'e2'], ['haferflocken', 40, null],
  ]);
});
