import { test } from 'node:test';
import assert from 'node:assert/strict';
import { massReihe, aenderung, prognose, bulkBericht } from '../js/logic/koerpermasse.js';
import { UEBUNGEN } from '../js/daten/uebungen.js';
import { uebungsVerzeichnis } from '../js/logic/training.js';

const tag = (datum, werte) => ({ datum, ...werte });

test('Maße: Reihe und Änderung', () => {
  const tage = [tag('2026-09-01', { masse: { arm: 38, taille: 80 } }), tag('2026-09-15', {}), tag('2026-10-01', { masse: { arm: 39.2, taille: 80.5 } })];
  assert.equal(massReihe(tage, 'arm').length, 2);
  assert.equal(aenderung(massReihe(tage, 'arm')).diff, 1.2);
  assert.equal(aenderung(massReihe(tage, 'arm'), '2026-09-20'), null);
});

test('Prognose per Regression', () => {
  const heute = new Date(2026, 9, 28, 12);
  const reihe = Array.from({ length: 28 }, (_, i) => ({ datum: `2026-10-${String(i + 1).padStart(2, '0')}`, kg: 78 + i * (0.3 / 7) }));
  const p = prognose(reihe, 80, heute);
  assert.equal(p.rateProWoche, 0.3);
  assert.ok(p.tageBis > 0 && p.tageBis < 60);
  // Ziel in der falschen Richtung → kein Datum
  assert.equal(prognose(reihe, 70, heute).datum, null);
  assert.equal(prognose(reihe.slice(0, 3), 80, heute), null);
});

test('Bulk-Bericht', () => {
  const v = uebungsVerzeichnis(UEBUNGEN);
  const tage = [
    tag('2026-09-01', { masse: { taille: 80, arm: 38 }, trainings: [{ id: 'a', typ: 'workout', start: 'x', ende: 'x', uebungen: [{ uebungId: 'bankdruecken_lh', saetze: [{ wdh: 5, kg: 80, erledigt: true }] }] }] }),
    tag('2026-10-20', { masse: { taille: 81, arm: 39 }, trainings: [{ id: 'b', typ: 'workout', start: 'x', ende: 'x', uebungen: [{ uebungId: 'bankdruecken_lh', saetze: [{ wdh: 5, kg: 90, erledigt: true }] }] }] }),
  ];
  const reihe = [{ datum: '2026-09-01', kg: 78 }, { datum: '2026-10-20', kg: 80 }];
  const b = bulkBericht(tage, reihe, '2026-09-01', v);
  assert.equal(b.kgDiff, 2);
  assert.equal(b.cmJeKg, 0.5);
  assert.equal(b.bewertung, 'sauber');
  assert.equal(b.kraft[0].uebungId, 'bankdruecken_lh');
  assert.equal(bulkBericht(tage, reihe, null, v), null);
});
