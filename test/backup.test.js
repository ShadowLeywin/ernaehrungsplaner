import { test } from 'node:test';
import assert from 'node:assert/strict';
import { erstelleBackup, pruefeBackup, backupDateiname, backupErinnerungFaellig } from '../js/logic/backup.js';
import { standardProfil } from '../js/logic/profil.js';

const beispiel = () => erstelleBackup({
  einstellungen: [['profil', standardProfil()]],
  tage: [
    ['2026-10-05', { datum: '2026-10-05', eintraege: [{ lebensmittelId: 'banane', gramm: 120 }] }],
    ['2026-10-03', { datum: '2026-10-03', eintraege: [] }],
  ],
}, new Date('2026-10-05T08:00:00Z'));

test('Backup: Export und Import ergeben dieselben Daten', () => {
  const original = beispiel();
  const { daten, info, fehler } = pruefeBackup(JSON.stringify(original));
  assert.equal(fehler, undefined);
  assert.deepEqual(daten, original.daten);
  assert.equal(info.anzahlTage, 2);
  assert.deepEqual(info.vonBis, ['2026-10-03', '2026-10-05']);
  assert.equal(info.hatProfil, true);
});

test('Backup: kaputte oder fremde Dateien werden abgelehnt', () => {
  assert.ok(pruefeBackup('kein json').fehler);
  assert.ok(pruefeBackup('{"app":"andere-app","format":1,"daten":{}}').fehler);
  assert.ok(pruefeBackup(JSON.stringify({ ...beispiel(), format: 99 })).fehler);
  assert.ok(pruefeBackup(JSON.stringify({ ...beispiel(), daten: { tage: 'kaputt' } })).fehler);
});

test('Backup: fehlende Bereiche gelten als leer', () => {
  const { daten } = pruefeBackup(JSON.stringify({ app: 'ernaehrungsplaner', format: 1, daten: {} }));
  assert.deepEqual(daten, { einstellungen: [], tage: [] });
});

test('Backup: Dateiname mit lokalem Datum', () => {
  assert.equal(backupDateiname(new Date(2026, 9, 5)), 'backup-ernaehrungsplaner-2026-10-05.json');
});

test('Backup-Erinnerung nach 7 Tagen, nur wenn Daten da sind', () => {
  const jetzt = new Date('2026-10-20T10:00:00Z');
  assert.equal(backupErinnerungFaellig(null, false, jetzt), false);
  assert.equal(backupErinnerungFaellig(null, true, jetzt), true);
  assert.equal(backupErinnerungFaellig('2026-10-15T10:00:00Z', true, jetzt), false);
  assert.equal(backupErinnerungFaellig('2026-10-10T10:00:00Z', true, jetzt), true);
});
