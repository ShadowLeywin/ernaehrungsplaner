import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verschiebe } from '../js/logik/datum.js';
import { aenderung, ruhepulsTrend, wertTrend, wochenRueckblick } from '../js/logik/rueckblick.js';

// Alle Werte sind erfunden.
const heute = '2026-11-15';
const tag = (n) => verschiebe(heute, -n);
const essen = (n, kcal, protein) => ({ datum: tag(n), gramm: 100, je100: { kcal, protein } });

test('Wochenrückblick: Schnitte nur über Tage mit Werten, Vorwoche getrennt', () => {
  const r = wochenRueckblick({
    datum: heute,
    eintraege: [essen(0, 2000, 150), essen(0, 500, 10), essen(2, 2100, 140), essen(8, 1800, 100)],
    messungen: [
      { art: 'schlaf', datum: tag(0), wert: 7 }, { art: 'schlaf', datum: tag(1), wert: 8 },
      { art: 'wasser', datum: tag(0), wert: 250 }, { art: 'wasser', datum: tag(0), wert: 500 }, { art: 'wasser', datum: tag(3), wert: 1250 },
      { art: 'schritte', datum: tag(9), wert: 5000 },
    ],
    tagSaetze: [
      { datum: tag(1), tagestyp: 'gym', tagestypQuelle: 'healthconnect' },
      { datum: tag(2), tagestyp: 'gym' },
      { datum: tag(10), tagestyp: 'calisthenics', tagestypQuelle: 'healthconnect' },
    ],
  });
  assert.equal(r.von, tag(6));
  assert.equal(r.jetzt.tageMitEssen, 2);
  assert.equal(r.jetzt.kcal, 2300, '(2500 + 2100) / 2 Tage');
  assert.equal(r.jetzt.protein, 150);
  assert.equal(r.jetzt.schlaf, 7.5);
  assert.equal(r.jetzt.wasser, 1000, 'Wasser je Tag summiert: (750 + 1250) / 2');
  assert.equal(r.jetzt.schritte, null);
  assert.equal(r.jetzt.trainings, 1, 'nur Trainings aus Health Connect, nicht der Plan');
  assert.equal(r.davor.kcal, 1800);
  assert.equal(r.davor.schritte, 5000);
  assert.equal(r.davor.trainings, 1);
});

test('aenderung: nur wenn beide Seiten Werte haben', () => {
  assert.equal(aenderung(2300, 1800), 500);
  assert.equal(aenderung(null, 1800), null);
});

test('Ruhepuls-Trend: ab 3 Werten, Änderung nur mit Vorwoche', () => {
  const m = (n, wert) => ({ art: 'ruhepuls', datum: tag(n), wert });
  assert.equal(ruhepulsTrend([m(0, 60), m(1, 62)], heute), null);
  assert.deepEqual(ruhepulsTrend([m(0, 60), m(1, 62), m(2, 61)], heute), { schnitt: 61, aenderung: null });
  assert.deepEqual(ruhepulsTrend([m(0, 60), m(1, 62), m(2, 61), m(7, 64), m(8, 64), m(9, 64)], heute), { schnitt: 61, aenderung: -3 });
});

test('Check-in und HRV im Rückblick, Trend für jede Art', () => {
  const r2 = wochenRueckblick({ datum: heute, messungen: [{ art: 'energie', datum: tag(0), wert: 4 }, { art: 'energie', datum: tag(1), wert: 2 }, { art: 'stress', datum: tag(0), wert: 3 }] });
  assert.equal(r2.jetzt.energie, 3);
  assert.equal(r2.jetzt.stress, 3);
  assert.equal(r2.jetzt.stimmung, null);
  const hrv = [0, 1, 2].map((n) => ({ art: 'hrv', datum: tag(n), wert: 40 + n }));
  assert.deepEqual(wertTrend(hrv, 'hrv', heute), { schnitt: 41, aenderung: null });
});
