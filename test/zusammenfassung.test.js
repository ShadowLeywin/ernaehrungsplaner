import assert from 'node:assert/strict';
import { test } from 'node:test';
import { anteileText, anzahlText, backupText, dabeiSeit, darstellungText, kennzahlen, koerperText, referenzText, wochenplanText, zieleText } from '../js/logik/zusammenfassung.js';
import { STANDARD_ANTEILE, STANDARD_WOCHE, STANDARD_ZIELE } from '../js/logik/ziele.js';

test('dabeiSeit: Monat des ersten Eintrags', () => {
  assert.equal(dabeiSeit(['2026-11-14', '2026-09-03', '2026-10-01']), 'September 2026');
  assert.equal(dabeiSeit([]), null);
});

test('kennzahlen: Tage zählen einzeln', () => {
  assert.deepEqual(kennzahlen({ eintraege: [{ datum: 'a' }, { datum: 'a' }, { datum: 'b' }], rezepte: [{}] }), { tage: 2, eintraege: 3, rezepte: 1 });
});

test('Ziele und Wochenplan kurz', () => {
  assert.equal(zieleText(STANDARD_ZIELE), '2.300 bis 2.700 kcal je Tag');
  assert.equal(zieleText({ gym: { kcal: 2500 }, calisthenics: { kcal: 2500 }, rest: { kcal: 2500 } }), '2.500 kcal je Tag');
  assert.equal(wochenplanText(STANDARD_WOCHE), '3× Gym · 2× Calisthenics · 2× Rest');
  assert.equal(wochenplanText(['rest', 'rest', 'rest', 'rest', 'rest', 'rest', 'rest']), '7× Rest');
});

test('Anteile, Referenz, Körper', () => {
  assert.equal(anteileText(STANDARD_ANTEILE), 'Standard-Aufteilung auf sechs Mahlzeiten');
  assert.equal(anteileText({ ...STANDARD_ANTEILE, fruehstueck: 30, abend: 20 }), 'Eigene Aufteilung auf sechs Mahlzeiten');
  const g = [{ id: 'm', name: 'männlich' }];
  const a = [{ id: '25', name: '25 bis 50 Jahre' }];
  assert.equal(referenzText({ geschlecht: 'm', alter: '25' }, g, a), 'männlich · 25 bis 50 Jahre');
  assert.equal(referenzText(null, g, a), 'Keine Angabe');
  assert.equal(koerperText({ wasserZielMl: 2500 }, [250, 500, 750]), 'Wasser 2.500 ml · Knöpfe 250 / 500 / 750');
});

test('Backup, Darstellung, Anzahl', () => {
  assert.equal(backupText(null, '2026-11-15'), 'Noch kein Backup');
  assert.equal(backupText('2026-11-15T07:00:00.000Z', '2026-11-15'), 'Heute gesichert');
  assert.equal(backupText('2026-11-14', '2026-11-15'), 'Gestern gesichert');
  assert.equal(backupText('2026-11-12', '2026-11-15'), 'Gesichert vor 3 Tagen');
  assert.equal(darstellungText({ thema: 'blatt', modus: 'dunkel', vibration: true }), 'Blatt · Dunkel · Vibration an');
  assert.equal(anzahlText(0, 'Angebot', 'Angebote', 'Noch keine Angebote'), 'Noch keine Angebote');
  assert.equal(anzahlText(1, 'Angebot', 'Angebote', '–'), '1 Angebot');
  assert.equal(anzahlText(1200, 'Angebot', 'Angebote', '–'), '1.200 Angebote');
});
