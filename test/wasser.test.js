import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wasserSumme, wasserBisUhrzeit, pruefeWassermenge } from '../js/logic/wasser.js';

const um = (stunde, minute = 0) => new Date(2026, 9, 5, stunde, minute).toISOString();
const eintraege = [
  { ml: 500, zeit: um(6, 30) },
  { ml: 800, zeit: um(9, 15) },
  { ml: 250, zeit: um(11, 59) },
  { ml: 500, zeit: um(12, 0) },
  { ml: 250, zeit: um(18, 0) },
];

test('Wasser: Tagessumme', () => {
  assert.equal(wasserSumme(eintraege), 2300);
  assert.equal(wasserSumme([]), 0);
});

test('Wasser: bis Mittag zählt nur Einträge vor der Uhrzeit', () => {
  assert.equal(wasserBisUhrzeit(eintraege, '12:00'), 1550);
  assert.equal(wasserBisUhrzeit(eintraege, '12:30'), 2050);
});

test('Wasser: manuelle Eingabe', () => {
  assert.deepEqual(pruefeWassermenge('330'), { ml: 330 });
  assert.deepEqual(pruefeWassermenge('330,4'), { ml: 330 });
  assert.ok(pruefeWassermenge('').fehler);
  assert.ok(pruefeWassermenge('-100').fehler);
  assert.ok(pruefeWassermenge('abc').fehler);
  assert.ok(pruefeWassermenge('5000').fehler);
});
