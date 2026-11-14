import assert from 'node:assert/strict';
import test from 'node:test';
import { formatKurz, formatLang, isoDatum, istGueltig, relativ, verschiebe, wochentagIndex } from '../js/logik/datum.js';

test('isoDatum nutzt die Ortszeit', () => {
  assert.equal(isoDatum(new Date(2026, 10, 13, 23, 59)), '2026-11-13');
  assert.equal(isoDatum(new Date(2026, 0, 5, 0, 1)), '2026-01-05');
});

test('istGueltig erkennt echte Kalendertage', () => {
  assert.equal(istGueltig('2026-11-13'), true);
  assert.equal(istGueltig('2028-02-29'), true);
  assert.equal(istGueltig('2026-02-31'), false);
  assert.equal(istGueltig('13.11.2026'), false);
  assert.equal(istGueltig(undefined), false);
});

test('verschiebe geht über Monats-, Jahres- und Zeitumstellungsgrenzen', () => {
  assert.equal(verschiebe('2026-11-30', 1), '2026-12-01');
  assert.equal(verschiebe('2026-01-01', -1), '2025-12-31');
  assert.equal(verschiebe('2026-03-28', 2), '2026-03-30'); // Sommerzeit beginnt am 29.03.2026
  assert.equal(verschiebe('2026-10-24', 2), '2026-10-26'); // Winterzeit beginnt am 25.10.2026
});

test('wochentagIndex: Montag ist 0, Sonntag ist 6', () => {
  assert.equal(wochentagIndex('2026-11-09'), 0);
  assert.equal(wochentagIndex('2026-11-13'), 4);
  assert.equal(wochentagIndex('2026-11-15'), 6);
});

test('Formate auf Deutsch', () => {
  assert.equal(formatLang('2026-11-13'), 'Freitag, 13. November');
  assert.equal(formatKurz('2026-11-13'), '13.11.2026');
});

test('relativ kennt heute, gestern, morgen', () => {
  assert.equal(relativ('2026-11-13', '2026-11-13'), 'Heute');
  assert.equal(relativ('2026-11-12', '2026-11-13'), 'Gestern');
  assert.equal(relativ('2026-11-14', '2026-11-13'), 'Morgen');
  assert.equal(relativ('2026-11-10', '2026-11-13'), null);
});
