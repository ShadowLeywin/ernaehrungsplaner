import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freieKapitel, neueKapitel, waehleTitel, titelName } from '../js/logic/geschichte.js';
import { leeresLager } from '../js/logic/lagerbau.js';
import { rueckblick } from '../js/logic/rueckblick.js';
import { UEBUNGEN } from '../js/daten/uebungen.js';
import { uebungsVerzeichnis } from '../js/logic/training.js';

test('Kapitel nach Level', () => {
  assert.equal(freieKapitel(1).length, 1);
  assert.deepEqual(neueKapitel(4, 8).map((k) => k.level), [5, 8]);
  assert.deepEqual(neueKapitel(8, 8), []);
});

test('Titel kaufen und wechseln', () => {
  let lager = leeresLager();
  assert.ok(waehleTitel(lager, 'eisenfaust', { erz: 999, glut: 999 }, 3).fehler);
  assert.ok(waehleTitel(lager, 'funkenschlaeger', { erz: 10, glut: 10 }, 3).fehler);
  lager = waehleTitel(lager, 'funkenschlaeger', { erz: 100, glut: 100 }, 3).lager;
  assert.equal(lager.titel.aktiv, 'funkenschlaeger');
  assert.deepEqual(lager.ausgegeben, { erz: 60, glut: 30 });
  // Wechsel auf einen gekauften Titel kostet nichts
  lager = waehleTitel({ ...lager, titel: { besitz: ['funkenschlaeger'], aktiv: null } }, 'funkenschlaeger', { erz: 0, glut: 0 }, 3).lager;
  assert.equal(lager.titel.aktiv, 'funkenschlaeger');
  assert.equal(titelName('eisenfaust'), 'Eisenfaust');
});

test('Rückblick', () => {
  const v = uebungsVerzeichnis(UEBUNGEN);
  const tage = [
    { datum: '2026-10-01', gewichtKg: 80, eintraege: [{ lebensmittelId: 'apfel', gramm: 100 }], trainings: [{ id: 'a', typ: 'workout', start: 'x', ende: 'x', dauerMin: 60, uebungen: [{ uebungId: 'bankdruecken_lh', saetze: [{ wdh: 10, kg: 100, erledigt: true }] }] }] },
    { datum: '2026-10-02', gewichtKg: 80.5, eintraege: [{ lebensmittelId: 'apfel', gramm: 100 }], trainings: [] },
    { datum: '2026-11-01', eintraege: [], trainings: [] },
  ];
  const r = rueckblick({ tage, kennzahlen: [], von: '2026-10-01', bis: '2026-10-31', verzeichnis: v, lebensmittel: [{ id: 'apfel', name: 'Apfel' }] });
  assert.equal(r.workouts, 1);
  assert.equal(r.tonnen, 1);
  assert.equal(r.laengsteSerie, 2);
  assert.deepEqual(r.lieblingsEssen, [{ name: 'Apfel', anzahl: 2 }]);
  assert.deepEqual(r.gewicht, { von: 80, bis: 80.5 });
  assert.equal(rueckblick({ tage, kennzahlen: [], von: '2027-01-01', bis: '2027-01-31', verzeichnis: v, lebensmittel: [] }), null);
});
