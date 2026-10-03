import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  kcalAusMakros, skaliereMakros, tagestypFuerDatum, summeAnteile, mahlzeitenZiele, wochentagIndex,
} from '../js/logic/ziele.js';
import { standardProfil } from '../js/logic/profil.js';

const trainingstag = { protein: 175, kh: 375, fett: 75 };

test('kcal aus Makros: Trainingstag ergibt 2.875 kcal', () => {
  assert.equal(kcalAusMakros(trainingstag), 2875);
});

test('Skalierung: Protein bleibt fest', () => {
  assert.equal(skaliereMakros(trainingstag, 2400).protein, 175);
});

test('Skalierung: Calisthenics-Tag 2.600 kcal', () => {
  const m = skaliereMakros(trainingstag, 2600);
  assert.deepEqual(m, { protein: 175, kh: 328, fett: 65 });
  assert.ok(Math.abs(kcalAusMakros(m) - 2600) <= 5);
});

test('Skalierung: Rest Day 2.400 kcal', () => {
  const m = skaliereMakros(trainingstag, 2400);
  assert.deepEqual(m, { protein: 175, kh: 293, fett: 59 });
  assert.ok(Math.abs(kcalAusMakros(m) - 2400) <= 5);
});

test('Skalierung auf den Basistag selbst ändert nichts', () => {
  assert.deepEqual(skaliereMakros(trainingstag, 2875), trainingstag);
});

test('Skalierung: Ziel unter Protein-kcal ergibt keine negativen Werte', () => {
  const m = skaliereMakros(trainingstag, 500);
  assert.equal(m.kh, 0);
  assert.equal(m.fett, 0);
});

test('Wochentag: Montag = 0, Sonntag = 6', () => {
  assert.equal(wochentagIndex(new Date(2026, 9, 5)), 0); // Mo 05.10.2026
  assert.equal(wochentagIndex(new Date(2026, 9, 11)), 6); // So 11.10.2026
});

test('Standardwoche: Mittwoch Beine, Samstag Calisthenics, Sonntag Rest', () => {
  const p = standardProfil();
  const mi = tagestypFuerDatum(p, new Date(2026, 9, 7));
  assert.equal(mi.typ.id, 'training');
  assert.equal(mi.notiz, 'Beine');
  assert.equal(tagestypFuerDatum(p, new Date(2026, 9, 10)).typ.id, 'calisthenics');
  assert.equal(tagestypFuerDatum(p, new Date(2026, 9, 11)).typ.id, 'rest');
});

test('Standardprofil: Makros passen zu den kcal-Zielen, Verteilung ergibt 100 %', () => {
  const p = standardProfil();
  for (const t of p.tagestypen) {
    assert.ok(Math.abs(kcalAusMakros(t) - t.kcal) <= 5, `${t.name}: ${kcalAusMakros(t)} vs ${t.kcal}`);
  }
  assert.equal(summeAnteile(p.mahlzeiten), 100);
});

test('Mahlzeitenziele: feste Einträge werden vorher abgezogen', () => {
  const p = standardProfil();
  const fix = { kcal: 175, protein: 0, kh: 30, fett: 5 };
  const ziele = mahlzeitenZiele(p.tagestypen[0], p.mahlzeiten, fix);
  assert.equal(ziele.length, 6);
  assert.equal(ziele[0].kcal, Math.round((2875 - 175) * 0.2)); // Frühstück 20 %
  const summeKcal = ziele.reduce((s, z) => s + z.kcal, 0);
  assert.ok(Math.abs(summeKcal - (2875 - 175)) <= 3);
});
