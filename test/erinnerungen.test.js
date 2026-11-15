import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALLE_IDS, bereinigeErinnerungen, erinnerungenText, planeErinnerungen, STANDARD_ERINNERUNGEN } from '../js/logik/erinnerungen.js';

test('Erinnerungen: Start aus, ungültige Zeiten fallen weg, höchstens 6 Wasser-Zeiten', () => {
  assert.deepEqual(bereinigeErinnerungen(null), STANDARD_ERINNERUNGEN);
  const e = bereinigeErinnerungen({ wasser: { an: true, zeiten: ['16:00', '25:00', '09:30', '09:30', 'x', '10:00', '11:00', '12:00', '13:00', '14:00'] }, supplements: { an: true, zeit: '7:00' } });
  assert.deepEqual(e.wasser.zeiten, ['09:30', '10:00', '11:00', '12:00', '13:00', '14:00']);
  assert.equal(e.supplements.zeit, '08:00', 'ungültige Zeit fällt auf den Startwert');
});

test('planeErinnerungen: nur eingeschaltete, feste Kennungen, Stunde und Minute', () => {
  assert.deepEqual(planeErinnerungen(null), []);
  const plan = planeErinnerungen({ wasser: { an: true, zeiten: ['10:00', '15:30'] }, checkin: { an: true, zeit: '21:15' } });
  assert.deepEqual(plan.map((p) => [p.id, p.stunde, p.minute]), [[1001, 10, 0], [1002, 15, 30], [1201, 21, 15]]);
  assert.ok(plan.every((p) => ALLE_IDS.includes(p.id)));
});

test('erinnerungenText für das Menü', () => {
  assert.equal(erinnerungenText(null), 'Aus');
  assert.equal(erinnerungenText({ wasser: { an: true, zeiten: ['10:00', '13:00'] }, supplements: { an: true, zeit: '08:00' } }), 'Wasser 2×, Supplements 08:00');
});
