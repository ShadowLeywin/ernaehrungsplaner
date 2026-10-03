import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  grundumsatz, zielZuschlag, sportKcal, berechneTagesbedarf, berechneMakros, pruefeZiel, zielGewicht, koerperVollstaendig,
} from '../js/logic/bedarf.js';
import { kcalAusMakros } from '../js/logic/ziele.js';

const koerper = { geschlecht: 'm', alter: 20, groesseCm: 180, gewichtKg: 75 };
const aktivitaeten = [{ id: 'gym', name: 'Gym', kcal: 300 }, { id: 'ebike', name: 'E-Bike', kcal: 200 }];

test('Grundumsatz nach Mifflin-St Jeor', () => {
  assert.equal(grundumsatz(koerper), 1780); // 750 + 1125 - 100 + 5
  assert.equal(grundumsatz({ ...koerper, geschlecht: 'w' }), 1614);
});

test('Zielzuschlag: 0,25 kg/Woche ≈ 275 kcal/Tag, Abnehmen negativ, Halten 0', () => {
  assert.equal(Math.round(zielZuschlag({ art: 'aufbau', kgProWoche: 0.25 })), 275);
  assert.equal(Math.round(zielZuschlag({ art: 'abnehmen', kgProWoche: 0.5 })), -550);
  assert.equal(zielZuschlag({ art: 'halten', kgProWoche: 0.5 }), 0);
});

test('Sport-kcal je Tagestyp, unbekannte Aktivitäten zählen 0', () => {
  assert.equal(sportKcal({ aktivitaeten: ['gym', 'ebike'] }, aktivitaeten), 500);
  assert.equal(sportKcal({ aktivitaeten: ['gibtsnicht'] }, aktivitaeten), 0);
  assert.equal(sportKcal({}, aktivitaeten), 0);
});

test('Tagesbedarf: Alltag × PAL + Sport + Zuschlag, auf 25 gerundet', () => {
  const profil = { koerper, alltag: 'sitzend', aktivitaeten, ziel: { art: 'aufbau', kgProWoche: 0.25 } };
  const b = berechneTagesbedarf(profil, { aktivitaeten: ['gym', 'ebike'] });
  assert.equal(b.alltag, 2492); // 1780 × 1,4
  assert.equal(b.sport, 500);
  assert.equal(b.zuschlag, 275);
  assert.equal(b.kcal, 3275); // 3267 → 3275
  assert.equal(b.kcal % 25, 0);
});

test('Tagesbedarf ohne vollständige Körperdaten: null', () => {
  assert.equal(berechneTagesbedarf({ koerper: { ...koerper, groesseCm: 0 } }, {}), null);
  assert.equal(koerperVollstaendig(undefined), false);
});

test('Makros: Protein g/kg, Fett-Anteil, Rest KH – Summe passt zu kcal', () => {
  const m = berechneMakros(2900, 75, { proteinGProKg: 2, fettAnteil: 0.25 });
  assert.equal(m.protein, 150);
  assert.equal(m.fett, 81);
  assert.ok(Math.abs(kcalAusMakros(m) - 2900) <= 5);
});

test('Makros: zu wenig kcal ergibt keine negativen KH', () => {
  assert.equal(berechneMakros(800, 100, { proteinGProKg: 2.5, fettAnteil: 0.3 }).kh, 0);
});

test('Zielprüfung: übliche Raten ohne Hinweis, zu schnelle mit Hinweis', () => {
  assert.deepEqual(pruefeZiel({ art: 'aufbau', kgProWoche: 0.275, wochen: 11 }, 75), []);
  assert.equal(pruefeZiel({ art: 'aufbau', kgProWoche: 0.75, wochen: 11 }, 75).length, 1);
  assert.equal(pruefeZiel({ art: 'abnehmen', kgProWoche: 1.2, wochen: 2 }, 80).length, 2);
});

test('Zielgewicht nach Plan', () => {
  assert.equal(zielGewicht(75, { art: 'aufbau', kgProWoche: 0.275, wochen: 11 }), 78);
  assert.equal(zielGewicht(80, { art: 'abnehmen', kgProWoche: 0.5, wochen: 10 }), 75);
});
