import { test } from 'node:test';
import assert from 'node:assert/strict';
import { feuerSerie, feuerStufe, istAktiv } from '../js/logic/feuer.js';

test('Serie mit Schonfrist', () => {
  const heute = '2026-10-10';
  assert.equal(feuerSerie(['2026-10-08', '2026-10-09', '2026-10-10'], heute), 3);
  // heute noch leer → zählt bis gestern
  assert.equal(feuerSerie(['2026-10-08', '2026-10-09'], heute), 2);
  // ein Lückentag wird verziehen
  assert.equal(feuerSerie(['2026-10-06', '2026-10-07', '2026-10-09', '2026-10-10'], heute), 4);
  // zwei Lückentage beenden die Serie
  assert.equal(feuerSerie(['2026-10-05', '2026-10-06', '2026-10-09', '2026-10-10'], heute), 2);
  assert.equal(feuerSerie(['2026-10-01'], heute), 0);
  assert.equal(feuerSerie(['2026-10-08'], heute), 1);
});

test('Stufen', () => {
  assert.equal(feuerStufe(0).name, 'Glut');
  assert.equal(feuerStufe(7).name, 'Lagerfeuer');
  assert.equal(feuerStufe(40).name, 'Esse');
  assert.equal(feuerStufe(40).naechste, null);
});

test('Aktiver Tag', () => {
  assert.equal(istAktiv({ eintraege: [{ gramm: 0 }] }), false);
  assert.equal(istAktiv({ wasser: [{ ml: 250 }] }), true);
});
