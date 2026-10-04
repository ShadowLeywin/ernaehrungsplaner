import { test } from 'node:test';
import assert from 'node:assert/strict';
import { koerperbau, letzteMasse, letztesGewicht } from '../js/logic/abbild.js';

test('mehr Muskeln (Rang) ergeben breitere Schultern und mehr Definition', () => {
  const anfaenger = koerperbau({ geschlecht: 'm', groesseCm: 180, gewichtKg: 75, rangAnteil: 0 });
  const profi = koerperbau({ geschlecht: 'm', groesseCm: 180, gewichtKg: 75, rangAnteil: 0.9 });
  assert.ok(profi.schulter > anfaenger.schulter);
  assert.ok(profi.definition > anfaenger.definition);
});

test('gemessene Taille bestimmt den Bauch', () => {
  const schlank = koerperbau({ groesseCm: 180, gewichtKg: 80, masse: { taille: 76, brust: 104 } });
  const breit = koerperbau({ groesseCm: 180, gewichtKg: 80, masse: { taille: 105, brust: 104 } });
  assert.ok(breit.taille > schlank.taille);
  assert.ok(breit.bauch > schlank.bauch);
  assert.equal(schlank.schaetzung, false);
});

test('ohne Daten gibt es eine neutrale Schätzung', () => {
  const k = koerperbau({});
  assert.equal(k.schaetzung, true);
  assert.ok(k.schulter > k.taille);
});

test('letzte Maße und Gewicht je Feld', () => {
  const tage = [
    { datum: '2026-09-01', masse: { arm: 38, taille: 82 }, gewichtKg: 78 },
    { datum: '2026-09-20', masse: { arm: 39 } },
  ];
  assert.deepEqual(letzteMasse(tage), { arm: 39, taille: 82 });
  assert.equal(letztesGewicht(tage, 70), 78);
  assert.equal(letztesGewicht([], 70), 70);
});
