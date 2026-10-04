import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scheiben, aufwaermSaetze, erholung } from '../js/logic/hantel.js';

test('Scheiben-Rechner', () => {
  assert.deepEqual(scheiben(100).proSeite, [25, 15]);
  assert.deepEqual(scheiben(62.5).proSeite, [20, 1.25]);
  assert.equal(scheiben(62.5).rest, 0);
  assert.equal(scheiben(61).rest, 1);
  assert.deepEqual(scheiben(20).proSeite, []);
});

test('Aufwärmsätze', () => {
  assert.deepEqual(aufwaermSaetze(100).map((s) => [s.kg, s.wdh]), [[20, 10], [40, 8], [60, 5], [80, 3]]);
  assert.deepEqual(aufwaermSaetze(40).map((s) => s.kg), [20, 25, 32.5]);
  assert.deepEqual(aufwaermSaetze(20), []);
});

test('Erholung je Muskel', () => {
  const jetzt = new Date('2026-10-04T18:00:00Z');
  const r = erholung([
    { muskel: 'brust', zeit: '2026-10-03T18:00:00Z', saetze: 10 },
    { muskel: 'bizeps', zeit: '2026-10-01T18:00:00Z', saetze: 4 },
  ], jetzt);
  assert.equal(r.brust.bereit, false);
  assert.equal(r.brust.rest, 48);
  assert.equal(r.bizeps.bereit, true);
});
