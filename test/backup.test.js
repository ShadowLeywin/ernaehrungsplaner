import assert from 'node:assert/strict';
import test from 'node:test';
import { backupDateiname, erstelleBackup, pruefeBackup } from '../js/logik/backup.js';
import { SCHEMA_VERSION, STORES } from '../js/logik/schema.js';

const DATEN = {
  zutaten: [{ id: 'eigen:1', name: 'Testriegel', je100: { kcal: 400 } }],
  eintraege: [{ id: 'e1', datum: '2026-11-13', slot: 'mittag', gramm: 50, je100: { kcal: 400 } }],
  tage: [{ datum: '2026-11-13', tagestyp: 'rest' }],
  einstellungen: [{ schluessel: 'woche', wert: ['gym'] }],
};

test('Backup enthält Kennung, Schema-Version, Zeitpunkt und alle Speicher', () => {
  const b = erstelleBackup({ zutaten: DATEN.zutaten }, new Date('2026-11-13T10:00:00Z'));
  assert.equal(b.app, 'elan');
  assert.equal(b.schemaVersion, SCHEMA_VERSION);
  assert.equal(b.erstelltAm, '2026-11-13T10:00:00.000Z');
  assert.deepEqual(Object.keys(b.daten), Object.keys(STORES));
  assert.deepEqual(b.daten.eintraege, []);
});

test('Hin und zurück: ein erstelltes Backup besteht die Prüfung unverändert', () => {
  const kopie = JSON.parse(JSON.stringify(erstelleBackup(DATEN)));
  const p = pruefeBackup(kopie);
  assert.equal(p.ok, true);
  assert.deepEqual(p.daten, DATEN);
  assert.deepEqual(p.anzahl, { zutaten: 1, eintraege: 1, tage: 1, einstellungen: 1 });
});

test('fremde und kaputte Dateien werden abgelehnt', () => {
  assert.equal(pruefeBackup(null).ok, false);
  assert.equal(pruefeBackup([]).ok, false);
  assert.equal(pruefeBackup({ app: 'andere', schemaVersion: 1, daten: {} }).ok, false);
  assert.equal(pruefeBackup({ app: 'elan', daten: {} }).ok, false);
  assert.equal(pruefeBackup({ app: 'elan', schemaVersion: 1 }).ok, false);
  assert.equal(pruefeBackup({ app: 'elan', schemaVersion: 1, daten: { zutaten: 'x' } }).ok, false);
});

test('ein Backup aus einer neueren Version wird nicht eingespielt', () => {
  const p = pruefeBackup({ app: 'elan', schemaVersion: SCHEMA_VERSION + 1, daten: {} });
  assert.equal(p.ok, false);
  assert.match(p.fehler[0], /neueren/);
});

test('Sätze ohne Schlüsselfeld machen das Backup ungültig', () => {
  const p = pruefeBackup({ app: 'elan', schemaVersion: 1, daten: { eintraege: [{ datum: '2026-11-13' }] } });
  assert.equal(p.ok, false);
  assert.match(p.fehler[0], /eintraege/);
});

test('fehlende Bereiche gelten als leer', () => {
  const p = pruefeBackup({ app: 'elan', schemaVersion: 1, daten: {} });
  assert.equal(p.ok, true);
  assert.deepEqual(p.daten.zutaten, []);
});

test('Dateiname trägt das Datum', () => {
  assert.equal(backupDateiname(new Date(2026, 10, 3)), 'elan-backup-2026-11-03.json');
});
