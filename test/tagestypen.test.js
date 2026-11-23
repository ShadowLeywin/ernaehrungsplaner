import assert from 'node:assert/strict';
import test from 'node:test';
import { STANDARD_TAGESTYPEN, TAGESTYPEN, bereinigeTagestypen, bereinigeWoche, bereinigeZiele, neueTypKennung, pruefeTagestypen, setzeTagestypen, tagestypFuer, tagestypKlasse } from '../js/logik/ziele.js';

test('Ohne Einstellung bleiben Gym, Calisthenics, Rest', () => {
  assert.deepEqual(bereinigeTagestypen(undefined).map((t) => t.id), ['gym', 'calisthenics', 'rest']);
  assert.deepEqual(bereinigeTagestypen([]).map((t) => t.id), ['gym', 'calisthenics', 'rest']);
});

test('Eigene Liste: bereinigt, höchstens 5, keine Doppelten', () => {
  const t = bereinigeTagestypen([
    { id: 'gym', name: ' Training ' }, { id: 'typ-a', name: 'Lauf' }, { id: 'typ-b', name: 'lauf' }, { id: 'GROSS', name: 'x' },
    { id: 'typ-c', name: 'Ruhe' }, { id: 'typ-d', name: 'D' }, { id: 'typ-e', name: 'E' }, { id: 'typ-f', name: 'F' },
  ]);
  assert.deepEqual(t.map((x) => x.name), ['Training', 'Lauf', 'Ruhe', 'D', 'E']);
});

test('Eingabe prüfen', () => {
  assert.equal(pruefeTagestypen([{ id: 'a', name: 'X' }]).ok, true);
  assert.match(pruefeTagestypen([]).fehler, /Mindestens/);
  assert.match(pruefeTagestypen([{ id: 'a', name: '' }]).fehler, /Namen/);
  assert.match(pruefeTagestypen([{ id: 'a', name: 'X' }, { id: 'b', name: 'x' }]).fehler, /gleich/);
  assert.match(pruefeTagestypen(Array.from({ length: 6 }, (_, i) => ({ id: `t${i}`, name: `T${i}` }))).fehler, /Höchstens 5/);
});

test('Eigene Typen gelten überall: Ziele mit Startwerten, Woche fällt auf vorhandene Typen zurück, Farbe nach Stelle', () => {
  try {
    setzeTagestypen([{ id: 'gym', name: 'Training' }, { id: 'typ-ruhe', name: 'Ruhetag' }]);
    assert.deepEqual(TAGESTYPEN.map((t) => t.name), ['Training', 'Ruhetag']);
    const ziele = bereinigeZiele({ gym: { kcal: 3000 } });
    assert.equal(ziele.gym.kcal, 3000);
    assert.equal(ziele['typ-ruhe'].kcal, 2500);
    assert.equal(ziele.calisthenics, undefined);
    // calisthenics und rest gibt es nicht mehr: diese Tage fallen auf den ersten Typ
    assert.deepEqual(bereinigeWoche(['gym', 'calisthenics', 'typ-ruhe']), ['gym', 'gym', 'typ-ruhe', 'gym', 'gym', 'gym', 'gym']);
    assert.equal(tagestypFuer('2026-11-24', null, { tagestyp: 'calisthenics' }), 'gym'); // Dienstag, alter Tagestyp ungültig
    assert.equal(tagestypKlasse('typ-ruhe'), 'tagestyp-farbe-1');
    assert.notEqual(neueTypKennung(TAGESTYPEN, () => 0.5), undefined);
  } finally {
    setzeTagestypen(null);
  }
  assert.deepEqual(TAGESTYPEN, STANDARD_TAGESTYPEN);
});
