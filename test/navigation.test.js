import assert from 'node:assert/strict';
import { test } from 'node:test';
import { richtungZwischen } from '../js/logik/navigation.js';

test('Leiste: rechts = vor, links = zurück', () => {
  assert.equal(richtungZwischen('#/heute', '#/woche'), 'vor');
  assert.equal(richtungZwischen('#/mehr', '#/health'), 'zurueck');
  assert.equal(richtungZwischen('#/zutaten', '#/health'), 'vor', 'Zutaten gehören zu Rezepte');
});

test('Tage blättern: späteres Datum = vor', () => {
  assert.equal(richtungZwischen('#/heute/2026-11-13', '#/heute/2026-11-14'), 'vor');
  assert.equal(richtungZwischen('#/heute/2026-11-14', '#/heute/2026-11-13'), 'zurueck');
  assert.equal(richtungZwischen('#/heute/2026-11-13', '#/heute'), 'keine');
});

test('Unterseiten: tiefer = vor, nach oben = zurück', () => {
  assert.equal(richtungZwischen('#/mehr', '#/mehr/ziele'), 'vor');
  assert.equal(richtungZwischen('#/rezepte/abc/bearbeiten', '#/rezepte/abc'), 'zurueck');
});

test('Erster Aufruf und Unbekanntes: nur einblenden', () => {
  assert.equal(richtungZwischen('', '#/heute'), 'keine');
  assert.equal(richtungZwischen(undefined, '#/heute'), 'keine');
  assert.equal(richtungZwischen('#/willkommen', '#/heute'), 'keine');
});
