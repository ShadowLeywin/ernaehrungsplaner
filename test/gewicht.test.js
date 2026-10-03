import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  gewichtsReihe, durchschnitt, gleitenderDurchschnitt, tatsaechlicheRate, zielRate, anpassungsVorschlag, wendeAnpassungAn,
} from '../js/logic/gewicht.js';
import { beispielProfil } from './beispielprofil.js';
import { kcalAusMakros } from '../js/logic/ziele.js';

const nahe = (ist, soll, toleranz) => assert.ok(Math.abs(ist - soll) <= toleranz, `${ist} statt ca. ${soll}`);

/** Messreihe ab Startdatum mit konstanter Wochenrate und kleinem Rauschen. */
function reihe(tage, startKg, rateProWoche, start = '2026-10-05') {
  const s = new Date(`${start}T12:00:00`);
  return Array.from({ length: tage }, (_, i) => {
    const d = new Date(s.getTime() + i * 86400000).toISOString().slice(0, 10);
    const rauschen = [0.3, -0.2, 0.1, -0.3, 0.2, 0, -0.1][i % 7];
    return { datum: d, kg: Math.round((startKg + (rateProWoche * i) / 7 + rauschen) * 10) / 10 };
  });
}
const tagNach = (n) => new Date(new Date('2026-10-05T12:00:00').getTime() + n * 86400000).toISOString().slice(0, 10);
const aufbau = { art: 'aufbau', kgProWoche: 0.275, wochen: 11 };

test('Reihe: nur Tage mit Gewicht, nach Datum sortiert', () => {
  const r = gewichtsReihe([{ datum: '2026-10-07', gewichtKg: 75.2 }, { datum: '2026-10-05', gewichtKg: 75 }, { datum: '2026-10-06' }]);
  assert.deepEqual(r.map((m) => m.datum), ['2026-10-05', '2026-10-07']);
});

test('Durchschnitt: braucht mindestens 3 Messungen im Fenster', () => {
  const r = reihe(7, 75, 0);
  nahe(durchschnitt(r, tagNach(6)), 75, 0.01);
  assert.equal(durchschnitt(r.slice(0, 2), tagNach(6)), null);
});

test('Gleitender Durchschnitt glättet das Rauschen', () => {
  const g = gleitenderDurchschnitt(reihe(14, 75, 0));
  nahe(g.at(-1).kg, 75, 0.01);
});

test('Tatsächliche Rate: +0,28 kg/Woche wird erkannt', () => {
  const r = reihe(14, 75, 0.28);
  nahe(tatsaechlicheRate(r, tagNach(13)).rate, 0.28, 0.02);
});

test('Zielrate mit Vorzeichen', () => {
  assert.equal(zielRate(aufbau), 0.275);
  assert.equal(zielRate({ art: 'abnehmen', kgProWoche: 0.5 }), -0.5);
  assert.equal(zielRate({ art: 'halten', kgProWoche: 0.5 }), 0);
});

test('Anpassung: unter 2 Wochen Daten kein Vorschlag', () => {
  assert.equal(anpassungsVorschlag(reihe(10, 75, 0), aufbau, tagNach(9)).status, 'zu_wenig_daten');
});

test('Anpassung: im Plan → keine Änderung', () => {
  assert.equal(anpassungsVorschlag(reihe(14, 75, 0.275), aufbau, tagNach(13)).status, 'im_plan');
});

test('Anpassung: Gewicht stagniert beim Aufbau → mehr kcal, auf 150 begrenzt', () => {
  const v = anpassungsVorschlag(reihe(14, 75, 0), aufbau, tagNach(13));
  assert.equal(v.status, 'anpassen');
  assert.equal(v.kcalProTag, 150); // 0,275 × 7700 / 7 × 0,5 ≈ 151 → max. 150
});

test('Anpassung: zu schnelle Zunahme → weniger kcal', () => {
  const v = anpassungsVorschlag(reihe(14, 75, 0.45), aufbau, tagNach(13));
  assert.equal(v.status, 'anpassen');
  assert.equal(v.kcalProTag, -100); // (0,275 − 0,45) × 1100 × 0,5 ≈ −96 → −100
});

test('Anpassung: nach einer Entscheidung 7 Tage warten', () => {
  assert.equal(anpassungsVorschlag(reihe(14, 75, 0), aufbau, tagNach(13), tagNach(10)).status, 'warten');
  assert.equal(anpassungsVorschlag(reihe(21, 75, 0), aufbau, tagNach(20), tagNach(13)).status, 'anpassen');
});

test('Anpassung anwenden: kcal aller Tagestypen ändern sich, Protein bleibt, Makros passen', () => {
  const profil = wendeAnpassungAn(beispielProfil(), 100);
  assert.deepEqual(profil.tagestypen.map((t) => t.kcal), [2975, 2700, 2500]);
  for (const t of profil.tagestypen) {
    assert.equal(t.protein, 175);
    assert.ok(Math.abs(kcalAusMakros(t) - t.kcal) <= 5);
  }
});
