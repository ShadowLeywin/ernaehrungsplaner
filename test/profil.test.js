import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  standardProfil, profilAusEinrichtung, vervollstaendigeProfil, referenzgruppeFuer, PROFIL_VERSION,
} from '../js/logic/profil.js';
import { summeAnteile, kcalAusMakros } from '../js/logic/ziele.js';

const einrichtung = () => ({
  koerper: { geschlecht: 'm', alter: 20, groesseCm: 180, gewichtKg: 75 },
  alltag: 'sitzend',
  aktivitaeten: [
    { id: 'gym', name: 'Gym', kcal: 300 },
    { id: 'ebike', name: 'E-Bike-Pendeln', kcal: 200 },
    { id: 'cali', name: 'Calisthenics', kcal: 250 },
  ],
  // Mo–Fr Gym + E-Bike, Sa Calisthenics, So Ruhetag
  wochenSport: [['gym', 'ebike'], ['ebike', 'gym'], ['gym', 'ebike'], ['gym', 'ebike'], ['gym', 'ebike'], ['cali'], []],
  ziel: { art: 'aufbau', kgProWoche: 0.275, wochen: 11, startDatum: '2026-10-05' },
  makroRegeln: { proteinGProKg: 2, fettAnteil: 0.25 },
});

test('Standardprofil ist neutral: keine Supplements, kein Morning Stack, Verteilung 100 %', () => {
  const p = standardProfil();
  assert.equal(p.supplements.length, 0);
  assert.equal(p.morningStack.aktiv, false);
  assert.equal(p.koerper.gewichtKg, null);
  assert.equal(summeAnteile(p.mahlzeiten), 100);
});

test('Einrichtung: Tagestypen aus den Sport-Kombinationen der Woche', () => {
  const p = profilAusEinrichtung(einrichtung());
  assert.deepEqual(p.tagestypen.map((t) => t.name), ['E-Bike-Pendeln + Gym', 'Calisthenics', 'Ruhetag']);
  assert.equal(p.woche[1].tagestyp, p.woche[0].tagestyp); // Reihenfolge der Auswahl egal
  assert.equal(p.woche[6].tagestyp, 'ruhetag');
  assert.equal(p.tagestypen.filter((t) => t.basis).length, 1);
  assert.equal(p.tagestypen.find((t) => t.basis).id, 'ebike+gym');
});

test('Einrichtung: kcal aus Bedarf, Protein für alle Tage gleich, Makros passen zu kcal', () => {
  const p = profilAusEinrichtung(einrichtung());
  const [training, cali, rest] = p.tagestypen;
  assert.ok(training.kcal > cali.kcal && cali.kcal > rest.kcal);
  for (const t of p.tagestypen) {
    assert.equal(t.protein, 150);
    assert.ok(Math.abs(kcalAusMakros(t) - t.kcal) <= 10, `${t.name}: ${kcalAusMakros(t)} vs ${t.kcal}`);
  }
  assert.equal(rest.kcal, 2800); // 1780 × 1,4 + 0 + 302,5 = 2794,5 → auf 25 gerundet
});

test('Referenzgruppe aus Geschlecht und Alter', () => {
  assert.equal(referenzgruppeFuer({ geschlecht: 'm', alter: 20 }), 'maenner_19_25');
  assert.equal(referenzgruppeFuer({ geschlecht: 'w', alter: 30 }), 'frauen_25_51');
});

test('Migration: altes Profil (Version 1) bekommt neue Felder, behält eigene Werte', () => {
  const alt = {
    version: 1,
    tagestypen: [{ id: 'training', name: 'Trainingstag', kcal: 2875, protein: 175, kh: 375, fett: 75 }],
    supplements: [{ id: 'x', name: 'X', aktiv: true, naehrwerte: {} }],
  };
  const p = vervollstaendigeProfil(alt);
  assert.equal(p.version, PROFIL_VERSION);
  assert.equal(p.tagestypen[0].kcal, 2875);
  assert.deepEqual(p.tagestypen[0].aktivitaeten, []);
  assert.equal(p.supplements.length, 1);
  assert.equal(p.koerper.alter, null);
  assert.equal(p.makroRegeln.fettAnteil, 0.25);
});
