import { test } from 'node:test';
import assert from 'node:assert/strict';
import { merkeZuletzt, schalteFavorit, kopiereMahlzeit, vorlageAusMahlzeit, eintraegeAusVorlage, MAX_ZULETZT } from '../js/logic/schnell.js';

test('Zuletzt: vorn, ohne Doppelte, begrenzt', () => {
  let l = merkeZuletzt([], 'a', 100);
  l = merkeZuletzt(l, 'b', 50);
  l = merkeZuletzt(l, 'a', 120);
  assert.deepEqual(l.map((x) => [x.id, x.gramm]), [['a', 120], ['b', 50]]);
  for (let i = 0; i < 40; i += 1) l = merkeZuletzt(l, `x${i}`, 1);
  assert.equal(l.length, MAX_ZULETZT);
});

test('Favoriten umschalten', () => {
  assert.deepEqual(schalteFavorit(['a'], 'b'), ['a', 'b']);
  assert.deepEqual(schalteFavorit(['a', 'b'], 'a'), ['b']);
});

test('Mahlzeit kopieren und Vorlagen', () => {
  const tag = { eintraege: [
    { mahlzeit: 'fr', lebensmittelId: 'hafer', gramm: 80 },
    { mahlzeit: 'fr', lebensmittelId: 'skyr', gramm: 0, offen: true },
    { mahlzeit: 'mi', lebensmittelId: 'reis', gramm: 100 },
  ] };
  let n = 0;
  const neu = () => `n${n += 1}`;
  const kopie = kopiereMahlzeit(tag, 'fr', 'fr', neu);
  assert.deepEqual(kopie.map((e) => [e.id, e.lebensmittelId, e.gramm]), [['n1', 'hafer', 80]]);
  const v = vorlageAusMahlzeit(tag, 'fr', 'v1', ' Frühstück ');
  assert.deepEqual(v, { id: 'v1', name: 'Frühstück', posten: [{ lebensmittelId: 'hafer', gramm: 80 }] });
  assert.equal(vorlageAusMahlzeit(tag, 'ab', 'v2', 'x'), null);
  assert.equal(eintraegeAusVorlage(v, 'ab', neu)[0].mahlzeit, 'ab');
});
