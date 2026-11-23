import assert from 'node:assert/strict';
import test from 'node:test';
import { NAEHRSTOFFE } from '../js/logik/naehrwerte.js';
import { bereinigeFavoriten, ergaenzePortion, mitExtraPortionen, naehrwertZeilen, pruefePortion, schalteFavorit, zutatenAuswahl } from '../js/logik/zutatenbank.js';

const Z = [
  { id: 'basis:apfel', name: 'Apfel', kategorie: 'obst', je100: { kcal: 52 }, portionen: [{ name: 'Stück', gramm: 170 }] },
  { id: 'basis:banane', name: 'Banane', kategorie: 'obst', je100: { kcal: 89 } },
  { id: 'basis:reis', name: 'Reis', kategorie: 'getreide', je100: { kcal: 350 } },
  { id: 'eigen:1', name: 'Testriegel', kategorie: 'suesses', je100: { kcal: 400 } },
];
const istEigen = (z) => z.id.startsWith('eigen:');

test('Favoriten: bereinigt, umschalten, neue vorn', () => {
  assert.deepEqual(bereinigeFavoriten(['a', 'a', 3, '', 'b']), ['a', 'b']);
  assert.deepEqual(bereinigeFavoriten('kaputt'), []);
  assert.deepEqual(schalteFavorit(['a', 'b'], 'c'), ['c', 'a', 'b']);
  assert.deepEqual(schalteFavorit(['a', 'b', 'c'], 'b'), ['a', 'c']);
});

test('Auswahl: Favoriten vorn, Filter, Kategorie, Suche', () => {
  const fav = ['basis:reis', 'basis:banane'];
  assert.deepEqual(zutatenAuswahl(Z, { favoriten: fav }).map((z) => z.id), ['basis:reis', 'basis:banane', 'basis:apfel', 'eigen:1']);
  assert.deepEqual(zutatenAuswahl(Z, { filter: 'favoriten', favoriten: fav }).map((z) => z.id), ['basis:reis', 'basis:banane']);
  assert.deepEqual(zutatenAuswahl(Z, { filter: 'eigene', istEigen }).map((z) => z.id), ['eigen:1']);
  assert.deepEqual(zutatenAuswahl(Z, { kategorie: 'obst', favoriten: fav }).map((z) => z.id), ['basis:banane', 'basis:apfel']);
  assert.deepEqual(zutatenAuswahl(Z, { begriff: 'ban' }).map((z) => z.id), ['basis:banane']);
});

test('Eigene Portion: prüfen, zusammenführen, gleicher Name ersetzt', () => {
  assert.deepEqual(pruefePortion({ name: 'Becher', gramm: '150' }).portion, { name: 'Becher', gramm: 150 });
  assert.equal(pruefePortion({ name: '', gramm: '150' }).ok, false);
  assert.equal(pruefePortion({ name: 'X', gramm: '0' }).ok, false);
  let extra = ergaenzePortion({}, 'basis:apfel', { name: 'Klein', gramm: 120 });
  extra = ergaenzePortion(extra, 'basis:apfel', { name: 'stück', gramm: 180 });
  assert.deepEqual(mitExtraPortionen(Z[0], extra).portionen, [{ name: 'Klein', gramm: 120 }, { name: 'stück', gramm: 180 }]);
  assert.equal(mitExtraPortionen(Z[1], extra), Z[1]);
});

test('Nährwerte für eine Menge, fehlende als unbekannt (null)', () => {
  const zeilen = naehrwertZeilen({ kcal: 52, protein: 0.3 }, NAEHRSTOFFE, 170);
  assert.equal(zeilen.length, NAEHRSTOFFE.length);
  assert.equal(zeilen.find((r) => r.id === 'kcal').wert, 88);
  assert.equal(zeilen.find((r) => r.id === 'protein').wert, 0.51);
  assert.equal(zeilen.find((r) => r.id === 'fett').wert, null);
});
