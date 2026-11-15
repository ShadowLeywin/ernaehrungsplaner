import assert from 'node:assert/strict';
import { test } from 'node:test';
import { QUELLE_HC, gewichtJeTag, lokalerTag, schlafJeNacht, schritteJeTag, zuUebernehmen } from '../js/logik/healthconnect.js';

// Alle Werte sind erfunden. Zeiten um die Mittagszeit, damit der Kalendertag in jeder Zeitzone gleich bleibt.

test('Schritte: Tagessummen je Kalendertag, 0 fällt weg', () => {
  const ergebnis = schritteJeTag([
    { startDate: '2026-11-13T12:00:00Z', value: 8123.4 },
    { startDate: '2026-11-14T12:00:00Z', value: 0 },
  ]);
  assert.deepEqual(ergebnis, [{ art: 'schritte', datum: lokalerTag('2026-11-13T12:00:00Z'), wert: 8123 }]);
});

test('Gewicht: letzte Messung des Tages, Gramm werden zu kg', () => {
  const ergebnis = gewichtJeTag([
    { startDate: '2026-11-14T11:00:00Z', value: 80.44, unit: 'kilogram' },
    { startDate: '2026-11-14T13:00:00Z', value: 80.1, unit: 'kilogram' },
    { startDate: '2026-11-15T12:00:00Z', value: 79800, unit: 'gram' },
  ]);
  assert.deepEqual(ergebnis.map((e) => e.wert), [80.1, 79.8]);
});

test('Schlaf: Phasen summiert, wach und im Bett zählen nicht, Tag des Aufwachens', () => {
  const ergebnis = schlafJeNacht([
    { startDate: '2026-11-15T01:00:00Z', endDate: '2026-11-15T04:00:00Z', sleepState: 'light' },
    { startDate: '2026-11-15T04:00:00Z', endDate: '2026-11-15T04:30:00Z', sleepState: 'awake' },
    { startDate: '2026-11-15T04:30:00Z', endDate: '2026-11-15T09:00:00Z', sleepState: 'deep' },
  ]);
  assert.equal(ergebnis.length, 1);
  assert.equal(ergebnis[0].wert, 7.5);
  assert.equal(ergebnis[0].datum, lokalerTag('2026-11-15T09:00:00Z'));
});

test('Zusammenführen: eigene Werte bleiben, leere Tage und alte Health-Connect-Werte werden ersetzt', () => {
  const vorhandene = [
    { art: 'gewicht', datum: '2026-11-14', wert: 81 },
    { art: 'gewicht', datum: '2026-11-15', wert: 80.5, quelle: QUELLE_HC },
    { art: 'schritte', datum: '2026-11-15', wert: 5000, quelle: QUELLE_HC },
  ];
  const gelesen = [
    { art: 'gewicht', datum: '2026-11-14', wert: 80.2 },
    { art: 'gewicht', datum: '2026-11-15', wert: 80.3 },
    { art: 'schritte', datum: '2026-11-15', wert: 5000 },
    { art: 'schlaf', datum: '2026-11-15', wert: 7.5 },
  ];
  const neu = zuUebernehmen(vorhandene, gelesen);
  assert.deepEqual(neu.map((n) => `${n.art} ${n.datum} ${n.wert}`), ['gewicht 2026-11-15 80.3', 'schlaf 2026-11-15 7.5']);
  assert.ok(neu.every((n) => n.quelle === QUELLE_HC));
});
