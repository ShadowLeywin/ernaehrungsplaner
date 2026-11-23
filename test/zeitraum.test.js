import assert from 'node:assert/strict';
import test from 'node:test';
import { pruefeBackup } from '../js/logik/backup.js';
import {
  MAX_TAGE, artVon, freierZeitraum, kalenderwoche, leseZeitraumSchluessel, migriereEinkaufSatz, monatUm, monatsName,
  monatsWochen, tageIm, verschiebeMonat, wocheUm, zeitraumSchluessel,
} from '../js/logik/zeitraum.js';

test('Woche läuft von Montag bis Sonntag, auch über den Monatswechsel', () => {
  assert.deepEqual(wocheUm('2026-11-23'), { art: 'woche', von: '2026-11-23', bis: '2026-11-29' });
  assert.deepEqual(wocheUm('2026-12-03'), { art: 'woche', von: '2026-11-30', bis: '2026-12-06' });
  assert.deepEqual(wocheUm('2026-11-29'), { art: 'woche', von: '2026-11-23', bis: '2026-11-29' });
});

test('Monat kennt seine Länge, auch im Schaltjahr', () => {
  assert.deepEqual(monatUm('2026-11-23'), { art: 'monat', von: '2026-11-01', bis: '2026-11-30' });
  assert.deepEqual(monatUm('2028-02-10'), { art: 'monat', von: '2028-02-01', bis: '2028-02-29' });
  assert.deepEqual(monatUm('2026-12-31'), { art: 'monat', von: '2026-12-01', bis: '2026-12-31' });
});

test('Monate blättern über den Jahreswechsel', () => {
  assert.equal(verschiebeMonat('2026-12', 1), '2027-01');
  assert.equal(verschiebeMonat('2027-01', -1), '2026-12');
  assert.equal(verschiebeMonat('2026-11', 14), '2028-01');
  assert.equal(monatsName('2026-12'), 'Dezember 2026');
});

test('Freier Zeitraum: getauscht, begrenzt, geprüft', () => {
  assert.deepEqual(freierZeitraum('2026-11-30', '2026-11-25').zeitraum, { art: 'frei', von: '2026-11-25', bis: '2026-11-30' });
  assert.equal(freierZeitraum('2026-11-23', '2026-11-29').zeitraum.art, 'woche');
  assert.equal(freierZeitraum('2026-11-01', '2026-11-30').zeitraum.art, 'monat');
  assert.equal(freierZeitraum('2026-11-01', '2026-11-01').ok, true);
  const zuLang = freierZeitraum('2026-11-01', '2027-01-02');
  assert.equal(zuLang.ok, false);
  assert.match(zuLang.fehler, new RegExp(`Höchstens ${MAX_TAGE}`));
  assert.equal(freierZeitraum('2026-11-01', '2026-11-31').ok, false);
  assert.equal(freierZeitraum('', '2026-11-30').ok, false);
});

test('Tage eines Zeitraums, beide Enden eingeschlossen', () => {
  assert.deepEqual(tageIm({ von: '2026-11-30', bis: '2026-12-02' }), ['2026-11-30', '2026-12-01', '2026-12-02']);
  assert.equal(tageIm(monatUm('2026-02-01')).length, 28);
});

test('Schlüssel hin und zurück, Unsinn wird erkannt', () => {
  const z = { von: '2026-11-23', bis: '2026-11-29' };
  assert.equal(zeitraumSchluessel(z), '2026-11-23..2026-11-29');
  assert.deepEqual(leseZeitraumSchluessel('2026-11-23..2026-11-29'), { art: 'woche', ...z });
  assert.equal(leseZeitraumSchluessel('2026-11-29..2026-11-23'), null);
  assert.equal(leseZeitraumSchluessel('2026-11-23'), null);
  assert.equal(leseZeitraumSchluessel('a..b'), null);
  assert.equal(artVon('2026-11-24', '2026-11-30'), 'frei');
});

test('Kalenderwoche nach ISO 8601', () => {
  assert.equal(kalenderwoche('2026-11-23'), 48);
  assert.equal(kalenderwoche('2027-01-01'), 53); // Freitag: gehört zur letzten Woche von 2026
  assert.equal(kalenderwoche('2026-01-01'), 1); // Donnerstag
  assert.equal(kalenderwoche('2026-12-28'), 53);
});

test('Monatsansicht: ganze Wochen, Tage außerhalb des Monats markiert', () => {
  const nov = monatsWochen('2026-11'); // 1.11.2026 ist ein Sonntag, 30.11. ein Montag
  assert.equal(nov.length, 6);
  assert.equal(nov[0].von, '2026-10-26');
  assert.deepEqual(nov[0].tage.map((t) => t.imMonat), [false, false, false, false, false, false, true]);
  assert.equal(nov.at(-1).von, '2026-11-30');
  assert.equal(nov.at(-1).tage.filter((t) => t.imMonat).length, 1);
  assert.equal(monatsWochen('2027-02').length, 4); // Februar 2027 beginnt an einem Montag
  for (const w of nov) assert.equal(w.tage.length, 7);
});

test('Alte Häkchen der Woche werden zum Zeitraum Montag bis Sonntag', () => {
  assert.deepEqual(migriereEinkaufSatz({ id: '2026-11-09|basis:apfel', woche: '2026-11-09', schluessel: 'basis:apfel', erledigt: true }),
    { id: '2026-11-09..2026-11-15|basis:apfel', zeitraum: '2026-11-09..2026-11-15', schluessel: 'basis:apfel', erledigt: true });
  // Eigene Posten behalten ihre Kennung
  assert.deepEqual(migriereEinkaufSatz({ id: 'u1', woche: '2026-11-09', eigen: true, name: 'Spülmittel', erledigt: false }),
    { id: 'u1', zeitraum: '2026-11-09..2026-11-15', eigen: true, name: 'Spülmittel', erledigt: false });
  // Schon umgezogen oder kaputt: unverändert
  const neu = { id: 'x', zeitraum: '2026-11-01..2026-11-30' };
  assert.equal(migriereEinkaufSatz(neu), neu);
  assert.deepEqual(migriereEinkaufSatz({ id: 'y', woche: 'kaputt' }), { id: 'y', woche: 'kaputt' });
});

test('Backup der Version 7 mit Häkchen wird auf Zeiträume angehoben', () => {
  const p = pruefeBackup({
    app: 'elan', schemaVersion: 7, daten: {
      einkauf: [
        { id: '2026-11-09|basis:apfel', woche: '2026-11-09', schluessel: 'basis:apfel', erledigt: true },
        { id: 'u1', woche: '2026-11-16', eigen: true, name: 'Spülmittel', erledigt: false },
      ],
    },
  });
  assert.equal(p.ok, true);
  assert.deepEqual(p.daten.einkauf.map((s) => [s.id, s.zeitraum, 'woche' in s]), [
    ['2026-11-09..2026-11-15|basis:apfel', '2026-11-09..2026-11-15', false],
    ['u1', '2026-11-16..2026-11-22', false],
  ]);
});
