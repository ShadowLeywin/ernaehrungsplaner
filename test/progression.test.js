import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UEBUNGEN } from '../js/daten/uebungen.js';
import { uebungsVerzeichnis } from '../js/logic/training.js';
import { zielBereich, steigerung, stillstand, schritt } from '../js/logic/progression.js';

const v = uebungsVerzeichnis(UEBUNGEN);
const s = (wdh, kg) => ({ wdh, kg, erledigt: true });

test('Zielbereich', () => {
  assert.deepEqual(zielBereich('8–12'), { min: 8, max: 12 });
  assert.deepEqual(zielBereich('10 Wdh'), { min: 10, max: 10 });
  assert.equal(zielBereich(''), null);
});

test('Schritte je Ausrüstung', () => {
  assert.equal(schritt(v.get('kniebeuge_lh')), 5);
  assert.equal(schritt(v.get('bankdruecken_lh')), 2.5);
  assert.equal(schritt(v.get('curls_kh')), 2);
});

test('Kraft: mehr Gewicht erst, wenn alle Sätze oben angekommen sind', () => {
  const bank = v.get('bankdruecken_lh');
  const ok = steigerung(bank, [s(12, 60), s(12, 60), s(12, 60)], '8–12');
  assert.equal(ok.art, 'mehrGewicht');
  assert.equal(ok.kg, 62.5);
  assert.equal(ok.wdh, 8);
  const nochNicht = steigerung(bank, [s(12, 60), s(10, 60)], '8–12');
  assert.equal(nochNicht.art, 'mehrWdh');
  assert.equal(nochNicht.wdh, 11);
});

test('Körpergewicht und Halten', () => {
  assert.equal(steigerung(v.get('klimmzuege'), [s(15, 0), s(15, 0)]).art, 'zusatzgewicht');
  assert.equal(steigerung(v.get('klimmzuege'), [s(8, 0), s(6, 0)]).wdh, 7);
  assert.equal(steigerung(v.get('plank'), [{ sek: 60, erledigt: true }], '45–60 s').sek, 65);
  assert.equal(steigerung(v.get('plank'), [{ sek: 50, erledigt: true }], '45–60 s'), null);
});

test('Stillstand', () => {
  const tage = [100, 110, 108, 109, 110, 109].map((kg, i) => ({
    datum: `2026-09-0${i + 1}`,
    trainings: [{ id: `t${i}`, typ: 'workout', start: 'x', ende: 'x', uebungen: [{ uebungId: 'bankdruecken_lh', saetze: [s(5, kg)] }] }],
  }));
  assert.equal(stillstand('bankdruecken_lh', tage, v), true);
  assert.equal(stillstand('bankdruecken_lh', tage.slice(0, 3), v), false);
});
