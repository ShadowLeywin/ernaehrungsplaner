import assert from 'node:assert/strict';
import test from 'node:test';
import { NAEHRSTOFFE, fuerMenge, kcalAusMakros, luecken, runde, summe, summeEintraege } from '../js/logik/naehrwerte.js';

test('fuerMenge rechnet Werte je 100 g auf die Menge um', () => {
  assert.deepEqual(fuerMenge({ kcal: 370, protein: 13.5 }, 80), { kcal: 296, protein: 10.8 });
});

test('fuerMenge lässt fehlende und ungültige Werte weg', () => {
  assert.deepEqual(fuerMenge({ kcal: 100, protein: null, fett: 'x' }, 50), { kcal: 50 });
  assert.deepEqual(fuerMenge({ kcal: 100 }, -5), {});
  assert.deepEqual(fuerMenge(undefined, 100), {});
});

test('summe addiert je Nährstoff und verträgt Lücken', () => {
  assert.deepEqual(summe([{ kcal: 100, protein: 5 }, { kcal: 50 }, undefined]), { kcal: 150, protein: 5 });
  assert.deepEqual(summe([]), {});
});

test('summeEintraege rechnet Tagebuch-Einträge zusammen', () => {
  const eintraege = [
    { gramm: 80, je100: { kcal: 370, protein: 13.5 } },
    { gramm: 250, je100: { kcal: 64, protein: 3.4 } },
  ];
  const s = summeEintraege(eintraege);
  assert.equal(s.kcal, 456);
  assert.equal(runde(s.protein, 1), 19.3);
});

test('luecken nennt Nährstoffe, die bei einem Eintrag fehlen', () => {
  const eintraege = [{ je100: { kcal: 1, protein: 1 } }, { je100: { kcal: 1 } }];
  assert.deepEqual(luecken(eintraege, ['kcal', 'protein', 'fett']), ['protein', 'fett']);
});

test('kcalAusMakros nutzt 4/4/9/2 kcal je Gramm', () => {
  assert.equal(kcalAusMakros({ protein: 10, kh: 20, fett: 5, ballaststoffe: 3 }), 40 + 80 + 45 + 6);
  assert.equal(kcalAusMakros({}), 0);
});

test('runde rundet kaufmännisch auf die gewünschten Stellen', () => {
  assert.equal(runde(1.005, 2), 1.01);
  assert.equal(runde(2.5), 3);
});

test('Nährstoff-Liste: eindeutige ids, jede mit Name und Einheit', () => {
  const ids = NAEHRSTOFFE.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const n of NAEHRSTOFFE) assert.ok(n.name && n.einheit && ['makro', 'mikro'].includes(n.gruppe), n.id);
});
