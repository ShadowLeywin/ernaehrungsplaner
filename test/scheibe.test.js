import assert from 'node:assert/strict';
import test from 'node:test';
import { fuellRadius, segmente, sektorPfad } from '../js/logik/scheibe.js';
import { SLOTS } from '../js/logik/ziele.js';

test('Segmente füllen zusammen mit den Lücken genau den Kreis', () => {
  const s = segmente(SLOTS, {}, 2000, 4);
  assert.equal(s.length, 6);
  assert.equal(s[0].start, 2);
  assert.ok(Math.abs(s.at(-1).ende - 358) < 1e-9);
  for (let i = 1; i < s.length; i += 1) assert.ok(Math.abs(s[i].start - s[i - 1].ende - 4) < 1e-9);
});

test('Füllstand je Slot richtet sich nach dem Anteil am Tagesziel', () => {
  const s = segmente(SLOTS, { fruehstueck: 250, mittag: 700 }, 2000);
  assert.equal(s[0].anteil, 0.5); // 250 von 500
  assert.equal(s[0].ueber, false);
  assert.ok(s[2].anteil > 1.05 && s[2].ueber); // 700 von 540
  assert.equal(s[1].anteil, 0);
});

test('ohne Tagesziel bleibt alles leer statt durch null zu teilen', () => {
  assert.ok(segmente(SLOTS, { fruehstueck: 300 }, 0).every((x) => x.anteil === 0));
});

test('fuellRadius ist flächentreu und begrenzt', () => {
  assert.equal(fuellRadius(40, 100, 0), 40);
  assert.equal(fuellRadius(40, 100, 1), 100);
  assert.equal(fuellRadius(40, 100, 2), 100);
  const halb = fuellRadius(40, 100, 0.5);
  assert.ok(Math.abs((halb ** 2 - 40 ** 2) / (100 ** 2 - 40 ** 2) - 0.5) < 1e-9);
});

test('sektorPfad liefert einen geschlossenen Pfad mit zwei Bögen', () => {
  const d = sektorPfad(100, 100, 40, 90, 0, 90);
  assert.match(d, /^M100 10A90 90 0 0 1 190 100L140 100A40 40 0 0 0 100 60Z$/);
  assert.match(sektorPfad(100, 100, 40, 90, 0, 200), /A90 90 0 1 1/);
});
