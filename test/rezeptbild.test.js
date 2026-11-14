import assert from 'node:assert/strict';
import { test } from 'node:test';
import { REZEPT_FARBEN, rezeptBild } from '../js/logik/rezeptbild.js';

test('Stichwort am Wortanfang bestimmt das Symbol', () => {
  assert.equal(rezeptBild('Chili sin Carne').symbol, '🌶️');
  assert.equal(rezeptBild('Linsen-Eintopf').symbol, '🍲');
  assert.equal(rezeptBild('Overnight Oats').symbol, '🥣');
  assert.equal(rezeptBild('Hähnchen mit Reis').symbol, '🍚', 'erstes passendes Stichwort in der Liste gewinnt');
});

test('Umlaute und Groß-/Kleinschreibung spielen keine Rolle', () => {
  assert.equal(rezeptBild('RÜHREI').symbol, '🍳');
  assert.equal(rezeptBild('Ofengemüse').symbol, '🥦');
});

test('Nur Wortanfänge zählen: „Weizen“ ist kein Ei', () => {
  assert.equal(rezeptBild('Weizenbrötchen').symbol, '🍽️');
  assert.equal(rezeptBild('Testgericht').symbol, '🍽️');
});

test('Farbe ist stabil und aus der Liste', () => {
  const a = rezeptBild('Testchili');
  assert.deepEqual(rezeptBild('Testchili'), a);
  assert.ok(REZEPT_FARBEN.includes(a.farbe));
  assert.ok(REZEPT_FARBEN.includes(rezeptBild('').farbe));
});

test('Bekannte Gerichte haben einen passenden Farbton', () => {
  assert.equal(rezeptBild('Chili sin Carne').farbe, 'grapefruit');
  assert.equal(rezeptBild('Lachs mit Ofengemüse').farbe, 'wasser');
  assert.equal(rezeptBild('Großer Salat').farbe, 'limette');
});
